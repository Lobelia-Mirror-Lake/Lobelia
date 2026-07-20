"""Forecast assembly — env + DB + classifier + advice."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from copilot.state import AdviceType
from model.inference import predict_classifier
from db.models import CheckIn, EnvSnapshot, Forecast, User, WearableDaily
from services.advice_service import generate_advice
from services.check_in_service import check_in_complete, compute_is_flare_up_from_check_in
from services.env_fetcher import fetch_env_daily

CHECK_IN_UNAVAILABLE_WARNING = (
    "Generated without today's symptom check-in; advice is based on the "
    "cached forecast, environment, and medical knowledge."
)


def _symptoms_summary(check_in: CheckIn | None) -> str | None:
    """Return a symptom summary, or None when no check-in was logged."""
    if check_in is None:
        return None
    parts = []
    if check_in.daily_day_symp:
        parts.append("daytime symptoms")
    if check_in.daily_night_symp:
        parts.append("night symptoms")
    if check_in.daily_limit_activity:
        parts.append("activity limitation")
    if not parts:
        # Explicit check-in with no symptoms selected — not the same as "missing."
        return "no significant symptoms reported"
    return ", ".join(parts)


def _humanize_top_features(
    top_features: list[str],
    env: dict,
    check_in: CheckIn | None,
) -> list[str]:
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

    if check_in is not None:
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


def _data_quality(
    *,
    unavailable_context: list[str] | None = None,
    missing_fields: list[str] | None = None,
    imputed_fields: list[str] | None = None,
    warnings: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "unavailable_context": list(unavailable_context or []),
        "missing_fields": list(missing_fields or []),
        "imputed_fields": list(imputed_fields or []),
        "warnings": list(warnings or []),
    }


async def run_forecast(
    db: Session,
    user: User,
    *,
    lat: float,
    lon: float,
    anchor_date: date | None = None,
    llm_provider: str | None = None,
    advice_type: AdviceType = "daily",
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

    forecast_context = {
        "risk_level": prediction["risk_level"],
        "flare_probability": prediction.get("flare_probability"),
        "predicted_flare_tomorrow": prediction.get("predicted_flare_tomorrow"),
        "contributing_factors": contributing_factors,
        "top_features": prediction.get("top_features", []),
    }
    advice_warnings: list[str] = []
    try:
        advice_result = await generate_advice(
            risk_level=prediction["risk_level"],
            contributing_factors=contributing_factors,
            calendar_event=check_in.calendar_event,
            symptoms_summary=_symptoms_summary(check_in) or "no significant symptoms reported",
            puffs_today=check_in.puffs_today,
            layer3_summary="",
            llm_provider=llm_provider,
            advice_type=advice_type,
            db=db,
            user=user,
            anchor_date=anchor_date,
            forecast=forecast_context,
            environment=env_features,
            return_warnings=True,
        )
        if isinstance(advice_result, tuple):
            advice, advice_warnings = advice_result
        else:
            # Maintains compatibility with existing mocks and custom integrations.
            advice = advice_result
    except Exception:
        advice = None
        advice_warnings.append(
            "Advice is temporarily unavailable; the ML forecast is still valid."
        )

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

    unavailable: list[str] = []
    if wearable is None:
        unavailable.append("wearables")
    if not (check_in.calendar_event or "").strip():
        unavailable.append("calendar")

    quality_warnings = list(advice_warnings)
    if "wearables" in unavailable:
        quality_warnings.append("Forecast used no wearable lag features for yesterday.")
    if "calendar" in unavailable:
        quality_warnings.append("No calendar event was provided for today.")

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
        "warnings": [*prediction.get("warnings", []), *advice_warnings],
        "advice": advice,
        "data_quality": _data_quality(
            unavailable_context=unavailable,
            missing_fields=env_result.get("missing") or prediction.get("missing_features") or [],
            warnings=quality_warnings,
        ),
    }


async def regenerate_advice(
    db: Session,
    user: User,
    *,
    anchor_date: date | None = None,
    llm_provider: str | None = None,
    advice_type: AdviceType = "daily",
) -> dict:
    """Re-run advice using a cached forecast. Check-in is optional."""
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

    contributing_factors = list(forecast.contributing_factors or [])
    snapshot = db.scalar(
        select(EnvSnapshot).where(
            EnvSnapshot.user_id == user.id,
            EnvSnapshot.date == anchor_date,
        )
    )
    env_features = snapshot.features if snapshot else {}

    # Prefer factors already stored on the forecast; enrich with current env when present.
    if env_features:
        env_only = _humanize_top_features([], env_features, None)
        for factor in env_only:
            if factor not in contributing_factors:
                contributing_factors.append(factor)
        contributing_factors = contributing_factors[:5]

    forecast_context = {
        "risk_level": forecast.risk_level or "Medium",
        "flare_probability": forecast.flare_probability,
        "contributing_factors": contributing_factors,
    }

    unavailable: list[str] = []
    advice_warnings: list[str] = []
    if check_in is None:
        unavailable.append("check_in")
        advice_warnings.append(CHECK_IN_UNAVAILABLE_WARNING)
    if not snapshot:
        unavailable.append("environment")
        advice_warnings.append(
            "No stored environment snapshot for this date; advice may be less specific."
        )
    calendar_event = check_in.calendar_event if check_in is not None else None
    if not (calendar_event or "").strip():
        unavailable.append("calendar")

    symptoms = _symptoms_summary(check_in)
    # Prompt still needs a string; mark unknown explicitly so the LLM does not
    # treat missing check-in as "no symptoms."
    symptoms_for_prompt = (
        symptoms
        if symptoms is not None
        else "not logged today (unknown — do not assume the patient is symptom-free)"
    )
    puffs_today = check_in.puffs_today if check_in is not None else 0

    try:
        advice_result = await generate_advice(
            risk_level=forecast.risk_level or "Medium",
            contributing_factors=contributing_factors,
            calendar_event=calendar_event,
            symptoms_summary=symptoms_for_prompt,
            puffs_today=puffs_today,
            layer3_summary="",
            llm_provider=llm_provider,
            advice_type=advice_type,
            db=db,
            user=user,
            anchor_date=anchor_date,
            forecast=forecast_context,
            environment=env_features,
            return_warnings=True,
        )
        if isinstance(advice_result, tuple):
            advice, provider_warnings = advice_result
            advice_warnings.extend(provider_warnings)
        else:
            advice = advice_result
    except Exception:
        advice = None
        advice_warnings.append(
            "Advice is temporarily unavailable; the stored ML forecast is still valid."
        )

    if advice is not None:
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
        "warnings": advice_warnings,
        "data_quality": _data_quality(
            unavailable_context=unavailable,
            missing_fields=list(snapshot.missing or []) if snapshot else [],
            warnings=advice_warnings,
        ),
    }
