"""Forecast assembly — env + DB + classifier + advice."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from model.inference import predict_classifier
from db.models import CheckIn, EnvSnapshot, Forecast, User, WearableDaily
from services.advice_service import generate_advice
from services.check_in_service import check_in_complete, compute_is_flare_up_from_check_in
from services.env_fetcher import fetch_env_daily
from services.episode_history import build_episode_summary


def _symptoms_summary(check_in: CheckIn) -> str:
    parts = []
    if check_in.daily_day_symp:
        parts.append("daytime symptoms")
    if check_in.daily_night_symp:
        parts.append("night symptoms")
    if check_in.daily_limit_activity:
        parts.append("activity limitation")
    if not parts:
        parts.append("no significant symptoms reported")
    return ", ".join(parts)


def _humanize_top_features(top_features: list[str], env: dict, check_in: CheckIn) -> list[str]:
    factors: list[str] = []
    pollen_map = {
        "tree_pollen": "tree pollen",
        "grass_pollen": "grass pollen",
        "weed_pollen": "weed pollen",
    }
    for key, label in pollen_map.items():
        level = env.get(key)
        if level in ("High", "Very High"):
            factors.append(f"High {label}")

    if check_in.daily_night_symp:
        factors.append("Night symptoms today")
    if check_in.daily_day_symp:
        factors.append("Daytime symptoms today")
    if check_in.puffs_today == 1:
        factors.append("Rescue inhaler used once")
    elif check_in.puffs_today >= 2:
        factors.append(f"Rescue inhaler used {check_in.puffs_today} times")
    if env.get("humidity") and env["humidity"] >= 80:
        factors.append("High humidity")
    if env.get("aqi") and env["aqi"] >= 3:
        factors.append("Elevated air quality index")

    if not factors and top_features:
        factors.extend(top_features[:3])
    return factors[:5]


async def run_forecast(
    db: Session,
    user: User,
    *,
    lat: float,
    lon: float,
    anchor_date: date | None = None,
    llm_provider: str | None = None,
) -> dict:
    anchor_date = anchor_date or date.today()
    forecast_for = anchor_date + timedelta(days=1)

    check_in = db.scalar(
        select(CheckIn).where(CheckIn.user_id == user.id, CheckIn.date == anchor_date)
    )
    if not check_in_complete(check_in):
        from api.errors import api_error

        raise api_error(
            400,
            "Log today's symptoms or at least one rescue inhaler puff before generating a forecast.",
            "CHECK_IN_REQUIRED",
        )

    yesterday = anchor_date - timedelta(days=1)
    wearable = db.scalar(
        select(WearableDaily).where(WearableDaily.user_id == user.id, WearableDaily.date == yesterday)
    )

    try:
        env_result = await fetch_env_daily(lat=lat, lon=lon, day=anchor_date)
    except Exception as exc:
        from api.errors import api_error

        # Avoid leaking upstream URLs / API keys in client-facing error messages.
        raise api_error(
            502,
            "Environment provider error. Please try again later.",
            "ENV_PROVIDER_ERROR",
        ) from exc

    env_features = env_result["features"]
    snapshot = db.scalar(
        select(EnvSnapshot).where(EnvSnapshot.user_id == user.id, EnvSnapshot.date == anchor_date)
    )
    if snapshot is None:
        snapshot = EnvSnapshot(
            user_id=user.id,
            date=anchor_date,
            lat=lat,
            lon=lon,
            provider=env_result["provider"],
            features=env_features,
            missing=env_result.get("missing"),
        )
        db.add(snapshot)
    else:
        snapshot.lat = lat
        snapshot.lon = lon
        snapshot.provider = env_result["provider"]
        snapshot.features = env_features
        snapshot.missing = env_result.get("missing")

    # Tomorrow env for temp_diff when available
    temp_diff = None
    try:
        tomorrow_env = await fetch_env_daily(lat=lat, lon=lon, day=forecast_for)
        t_today = env_features.get("temperature")
        t_tomorrow = tomorrow_env["features"].get("temperature")
        if t_today is not None and t_tomorrow is not None:
            temp_diff = float(t_tomorrow) - float(t_today)
    except Exception:
        pass

    classifier_payload = {
        **env_features,
        "sleep_minutes_lag": float(wearable.sleep_minutes) if wearable and wearable.sleep_minutes is not None else None,
        "sedentary_minutes_lag": float(wearable.sedentary_minutes)
        if wearable and wearable.sedentary_minutes is not None
        else None,
        "running_minutes_lag": float(wearable.running_minutes)
        if wearable and wearable.running_minutes is not None
        else None,
        "total_steps_lag": float(wearable.total_steps) if wearable and wearable.total_steps is not None else None,
        "avg_hr_lag": float(wearable.avg_hr) if wearable and wearable.avg_hr is not None else None,
        "temp_diff_tomorrow": temp_diff,
        "is_flare_up": compute_is_flare_up_from_check_in(check_in),
    }

    try:
        prediction = predict_classifier(classifier_payload)
    except FileNotFoundError as exc:
        from api.errors import api_error

        raise api_error(503, str(exc), "CLASSIFIER_UNAVAILABLE") from exc

    contributing_factors = _humanize_top_features(
        prediction.get("top_features", []),
        env_features,
        check_in,
    )

    layer3 = build_episode_summary(
        db,
        user.id,
        anchor_date=anchor_date,
        contributing_factors=contributing_factors,
    )

    try:
        advice = await generate_advice(
            risk_level=prediction["risk_level"],
            contributing_factors=contributing_factors,
            calendar_event=check_in.calendar_event,
            symptoms_summary=_symptoms_summary(check_in),
            puffs_today=check_in.puffs_today,
            layer3_summary=layer3,
            llm_provider=llm_provider,
        )
    except Exception as exc:
        from api.errors import api_error

        raise api_error(502, str(exc), "LLM_PROVIDER_ERROR") from exc

    record = Forecast(
        user_id=user.id,
        date=anchor_date,
        forecast_for=forecast_for,
        flare_probability=prediction.get("flare_probability"),
        risk_level=prediction.get("risk_level"),
        contributing_factors=contributing_factors,
        advice=advice,
    )
    db.add(record)
    db.commit()

    return {
        "date": anchor_date.isoformat(),
        "forecast_for": forecast_for.isoformat(),
        "prediction_mode": prediction.get("prediction_mode", "classifier"),
        "flare_probability": prediction.get("flare_probability"),
        "predicted_flare_tomorrow": prediction.get("predicted_flare_tomorrow"),
        "risk_level": prediction.get("risk_level"),
        "contributing_factors": contributing_factors,
        "top_features": prediction.get("top_features", []),
        "cold_start": prediction.get("cold_start", False),
        "missing_features": prediction.get("missing_features", []),
        "warnings": prediction.get("warnings", []),
        "advice": advice,
    }


async def regenerate_advice(
    db: Session,
    user: User,
    *,
    anchor_date: date | None = None,
    llm_provider: str | None = None,
) -> dict:
    """Re-run the RAG advice pipeline using the latest cached forecast for a date."""
    from api.errors import api_error

    anchor_date = anchor_date or date.today()
    forecast = db.scalar(
        select(Forecast)
        .where(Forecast.user_id == user.id, Forecast.date == anchor_date)
        .order_by(Forecast.created_at.desc())
    )
    if forecast is None:
        raise api_error(
            404,
            "No forecast found for this date. Run POST /v1/forecast first.",
            "FORECAST_NOT_FOUND",
        )

    check_in = db.scalar(
        select(CheckIn).where(CheckIn.user_id == user.id, CheckIn.date == anchor_date)
    )
    if check_in is None:
        check_in = CheckIn(
            user_id=user.id,
            date=anchor_date,
            puffs_today=0,
            daily_day_symp=False,
            daily_night_symp=False,
            daily_limit_activity=False,
            symptoms_logged=False,
        )

    contributing_factors = forecast.contributing_factors or []
    layer3 = build_episode_summary(
        db,
        user.id,
        anchor_date=anchor_date,
        contributing_factors=contributing_factors,
    )

    try:
        advice = await generate_advice(
            risk_level=forecast.risk_level or "Medium",
            contributing_factors=contributing_factors,
            calendar_event=check_in.calendar_event,
            symptoms_summary=_symptoms_summary(check_in),
            puffs_today=check_in.puffs_today,
            layer3_summary=layer3,
            llm_provider=llm_provider,
        )
    except Exception as exc:
        raise api_error(502, str(exc), "LLM_PROVIDER_ERROR") from exc

    forecast.advice = advice
    db.commit()
    db.refresh(forecast)

    return {
        "date": anchor_date.isoformat(),
        "forecast_for": forecast.forecast_for.isoformat(),
        "risk_level": forecast.risk_level,
        "flare_probability": forecast.flare_probability,
        "contributing_factors": contributing_factors,
        "advice": advice,
    }
