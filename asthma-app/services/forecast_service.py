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


def _unpack_advice_result(advice_result) -> tuple[dict | None, list[str], dict | None]:
    """Accept (advice, warnings) or (advice, warnings, debug) from generate_advice / mocks."""
    if isinstance(advice_result, tuple):
        advice = advice_result[0] if len(advice_result) > 0 else None
        warnings = list(advice_result[1]) if len(advice_result) > 1 else []
        debug = advice_result[2] if len(advice_result) > 2 else None
        return advice, warnings, debug
    return advice_result, [], None


def forecast_has_advice(advice: Any) -> bool:
    """True when stored advice has a usable summary or at least one section."""
    if not isinstance(advice, dict):
        return False
    if str(advice.get("summary") or "").strip():
        return True
    sections = advice.get("sections") or []
    return isinstance(sections, list) and any(
        isinstance(section, dict) and str(section.get("body") or "").strip()
        for section in sections
    )


async def ensure_forecast_advice(
    db: Session,
    user: User,
    forecast: dict | None,
    *,
    llm_provider: str | None = None,
    advice_type: AdviceType = "daily",
) -> dict | None:
    """If a stored forecast is missing advice, regenerate and merge it."""
    if forecast is None or forecast_has_advice(forecast.get("advice")):
        return forecast

    anchor_date = date.fromisoformat(forecast["date"])
    try:
        regenerated = await regenerate_advice(
            db,
            user,
            anchor_date=anchor_date,
            llm_provider=llm_provider,
            advice_type=advice_type,
        )
    except Exception:
        return forecast

    if not forecast_has_advice(regenerated.get("advice")):
        return forecast

    return {
        **forecast,
        "advice": regenerated["advice"],
        "warnings": regenerated.get("warnings", forecast.get("warnings", [])),
        "data_quality": regenerated.get("data_quality", forecast.get("data_quality")),
        "contributing_factors": regenerated.get(
            "contributing_factors", forecast.get("contributing_factors")
        ),
        "calendar_events": regenerated.get(
            "calendar_events", forecast.get("calendar_events")
        ),
    }


async def _try_run_forecast(
    db: Session,
    user: User,
    *,
    lat: float,
    lon: float,
    anchor_date: date,
    llm_provider: str | None = None,
    advice_type: AdviceType = "daily",
    timezone_name: str = "America/Chicago",
) -> dict | None:
    """Run forecast for an anchor day; return None if check-in/other soft failure."""
    from api.errors import APIError

    try:
        return await run_forecast(
            db,
            user,
            lat=lat,
            lon=lon,
            anchor_date=anchor_date,
            llm_provider=llm_provider,
            advice_type=advice_type,
            timezone_name=timezone_name,
        )
    except APIError as exc:
        if exc.code in {
            "CHECK_IN_REQUIRED",
            "CLASSIFIER_UNAVAILABLE",
            "FORECAST_NOT_FOUND",
            "ENV_PROVIDER_ERROR",
        }:
            return None
        raise
    except Exception:
        return None


async def ensure_card_predictions(
    db: Session,
    user: User,
    *,
    lat: float,
    lon: float,
    today: date | None = None,
    llm_provider: str | None = None,
    advice_type: AdviceType = "daily",
    timezone_name: str = "America/Chicago",
) -> dict:
    """Get-or-create Home/Statistics card predictions.

    - ``today``: prediction targeting calendar today (usually from yesterday's check-in)
    - ``tomorrow``: prediction targeting tomorrow (from today's check-in)

    Returns stored rows when present; otherwise runs ML+advice. Also backfills
    advice when a stored forecast has ``advice: null``.

    Tomorrow is only *generated* after 18:00 local (matching the UI unlock rule).
    """
    from api.errors import api_error
    from datetime import datetime
    from zoneinfo import ZoneInfo

    today = today or date.today()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    try:
        local_now = datetime.now(ZoneInfo(timezone_name))
    except Exception:
        local_now = datetime.now().astimezone()
    after_six = local_now.hour >= 18

    for_today = get_forecast(db, user.id, targeting=today)
    for_tomorrow = get_forecast(db, user.id, targeting=tomorrow)

    if for_today is None:
        for_today = await _try_run_forecast(
            db,
            user,
            lat=lat,
            lon=lon,
            anchor_date=yesterday,
            llm_provider=llm_provider,
            advice_type=advice_type,
            timezone_name=timezone_name,
        )
    else:
        for_today = await ensure_forecast_advice(
            db,
            user,
            for_today,
            llm_provider=llm_provider,
            advice_type=advice_type,
        )

    if for_tomorrow is None:
        if after_six:
            for_tomorrow = await _try_run_forecast(
                db,
                user,
                lat=lat,
                lon=lon,
                anchor_date=today,
                llm_provider=llm_provider,
                advice_type=advice_type,
                timezone_name=timezone_name,
            )
    else:
        for_tomorrow = await ensure_forecast_advice(
            db,
            user,
            for_tomorrow,
            llm_provider=llm_provider,
            advice_type=advice_type,
        )

    if for_today is None and for_tomorrow is None:
        raise api_error(
            404,
            "No prediction available yet. Complete a symptom check-in to generate a forecast.",
            "FORECAST_NOT_FOUND",
        )

    return {"today": for_today, "tomorrow": for_tomorrow}


async def run_forecast(
    db: Session,
    user: User,
    *,
    lat: float,
    lon: float,
    anchor_date: date | None = None,
    llm_provider: str | None = None,
    advice_type: AdviceType = "daily",
    calendar_events: list[dict] | None = None,
    timezone_name: str = "America/Chicago",
) -> dict:
    from services import google_calendar as gcal

    anchor_date = anchor_date or date.today()
    forecast_for = anchor_date + timedelta(days=1)

    # Reuse a stored prediction for this check-in day (do not re-run ML).
    # If advice was missing (LLM outage on first run), fill it in now.
    existing = get_forecast(db, user.id, run_on=anchor_date)
    if existing is not None:
        return await ensure_forecast_advice(
            db,
            user,
            existing,
            llm_provider=llm_provider,
            advice_type=advice_type,
        ) or existing

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

    # Structured calendar for tomorrow (forecast_for): override → Google → check-in cache
    resolved_events: list[dict] = []
    calendar_source = "none"
    if calendar_events is not None:
        resolved_events = calendar_events
        calendar_source = "request"
    elif user.google_calendar_refresh_token:
        try:
            resolved_events = await gcal.fetch_events_for_day(
                user.google_calendar_refresh_token,
                day=forecast_for,
                timezone_name=timezone_name,
            )
            for event in resolved_events:
                event.setdefault("source", "google_calendar")
            calendar_source = "google_calendar"
        except Exception:
            # Soft-fail: still forecast without calendar rather than 502 the whole request.
            resolved_events = list(check_in.calendar_events or [])
            calendar_source = "check_in_fallback" if resolved_events else "google_fetch_failed"
    elif check_in.calendar_events:
        resolved_events = list(check_in.calendar_events)
        calendar_source = "check_in"

    for event in resolved_events:
        if isinstance(event, dict):
            event.setdefault("source", calendar_source if calendar_source != "none" else "check_in")

    calendar_summary = gcal.events_to_summary(resolved_events) or check_in.calendar_event
    if resolved_events:
        check_in.calendar_events = resolved_events
        check_in.calendar_event = calendar_summary

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
    advice_debug: dict | None = None
    try:
        import asyncio
        import os

        advice_timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "45")) * 3
        advice_result = await asyncio.wait_for(
            generate_advice(
                risk_level=prediction["risk_level"],
                contributing_factors=contributing_factors,
                calendar_event=calendar_summary,
                calendar_events=resolved_events,
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
            ),
            timeout=advice_timeout,
        )
        advice, advice_warnings, advice_debug = _unpack_advice_result(advice_result)
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
        calendar_events=resolved_events or None,
    )
    db.add(record)
    db.commit()

    # Episode memory after the forecast is saved so embedding never blocks the response path.
    from services.episode_store import soft_upsert_episode_for_forecast

    soft_upsert_episode_for_forecast(
        db,
        user.id,
        anchor_date,
        environment=env_features,
    )
    try:
        db.commit()
    except Exception:
        db.rollback()

    unavailable: list[str] = []
    if wearable is None:
        unavailable.append("wearables")
    if not resolved_events and not (calendar_summary or "").strip():
        unavailable.append("calendar")

    quality_warnings = list(advice_warnings)
    if "wearables" in unavailable:
        quality_warnings.append("Forecast used no wearable lag features for yesterday.")
    if "calendar" in unavailable:
        quality_warnings.append("No calendar event was provided for today.")

    payload = {
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
        "calendar_events": resolved_events,
        "calendar_source": calendar_source,
        "advice": advice,
        "data_quality": _data_quality(
            unavailable_context=unavailable,
            missing_fields=env_result.get("missing") or prediction.get("missing_features") or [],
            warnings=quality_warnings,
        ),
    }
    if advice_debug is not None:
        payload["debug"] = advice_debug
    return payload


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

    symptoms = _symptoms_summary(check_in)
    # Prompt still needs a string; mark unknown explicitly so the LLM does not
    # treat missing check-in as "no symptoms."
    symptoms_for_prompt = (
        symptoms
        if symptoms is not None
        else "not logged today (unknown — do not assume the patient is symptom-free)"
    )
    puffs_today = check_in.puffs_today if check_in is not None else 0

    from services import google_calendar as gcal

    check_in_events = list(check_in.calendar_events or []) if check_in is not None else []
    resolved_events: list[dict] = list(forecast.calendar_events or check_in_events or [])
    if not resolved_events and user.google_calendar_refresh_token:
        try:
            resolved_events = await gcal.fetch_events_for_day(
                user.google_calendar_refresh_token,
                day=forecast.forecast_for,
            )
            for event in resolved_events:
                event.setdefault("source", "google_calendar")
        except Exception:
            resolved_events = []
    for event in resolved_events:
        if isinstance(event, dict):
            event.setdefault("source", event.get("source") or "check_in")
    calendar_summary = gcal.events_to_summary(resolved_events) or (
        check_in.calendar_event if check_in is not None else None
    )
    if not resolved_events and not (calendar_summary or "").strip():
        unavailable.append("calendar")

    try:
        import asyncio
        import os

        advice_timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "45")) * 3
        advice_result = await asyncio.wait_for(
            generate_advice(
                risk_level=forecast.risk_level or "Medium",
                contributing_factors=contributing_factors,
                calendar_event=calendar_summary or calendar_event,
                calendar_events=resolved_events,
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
            ),
            timeout=advice_timeout,
        )
        advice, provider_warnings, advice_debug = _unpack_advice_result(advice_result)
        advice_warnings.extend(provider_warnings)
    except Exception:
        advice = None
        advice_debug = None
        advice_warnings.append(
            "Advice is temporarily unavailable; the stored ML forecast is still valid."
        )

    if advice is not None:
        forecast.advice = advice
    forecast.calendar_events = resolved_events or forecast.calendar_events
    db.commit()
    db.refresh(forecast)

    payload = {
        "date": anchor_date.isoformat(),
        "forecast_for": forecast.forecast_for.isoformat(),
        "risk_level": forecast.risk_level,
        "flare_probability": forecast.flare_probability,
        "contributing_factors": contributing_factors,
        "calendar_events": resolved_events,
        "advice": advice,
        "warnings": advice_warnings,
        "data_quality": _data_quality(
            unavailable_context=unavailable,
            missing_fields=list(snapshot.missing or []) if snapshot else [],
            warnings=advice_warnings,
        ),
    }
    if advice_debug is not None:
        payload["debug"] = advice_debug
    return payload


def forecast_to_dict(record: Forecast) -> dict:
    return {
        "date": record.date.isoformat(),
        "forecast_for": record.forecast_for.isoformat(),
        "flare_probability": record.flare_probability,
        "predicted_flare_tomorrow": bool(record.flare_probability and record.flare_probability >= 0.5),
        "risk_level": record.risk_level,
        "contributing_factors": record.contributing_factors or [],
        "calendar_events": record.calendar_events or [],
        "advice": record.advice,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


def list_forecasts(
    db: Session,
    user_id,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[dict]:
    query = select(Forecast).where(Forecast.user_id == user_id).order_by(Forecast.date.desc())
    if from_date:
        query = query.where(Forecast.date >= from_date)
    if to_date:
        query = query.where(Forecast.date <= to_date)
    rows = db.scalars(query).all()
    seen: set[date] = set()
    items: list[dict] = []
    for row in rows:
        if row.date in seen:
            continue
        seen.add(row.date)
        items.append(forecast_to_dict(row))
    return items


def get_forecast(
    db: Session,
    user_id,
    *,
    run_on: date | None = None,
    targeting: date | None = None,
) -> dict | None:
    """Fetch a cached forecast by run day and/or target day.

    - ``run_on``: the check-in / POST day (``Forecast.date``)
    - ``targeting``: the day being predicted (``Forecast.forecast_for``)

    Provide at least one. If both are set, both filters apply.
    """
    if run_on is None and targeting is None:
        raise ValueError("Provide run_on and/or targeting")

    query = select(Forecast).where(Forecast.user_id == user_id)
    if run_on is not None:
        query = query.where(Forecast.date == run_on)
    if targeting is not None:
        query = query.where(Forecast.forecast_for == targeting)
    record = db.scalar(query.order_by(Forecast.created_at.desc()))
    return forecast_to_dict(record) if record else None


def get_current_prediction(db: Session, user_id, *, today: date | None = None) -> dict | None:
    """Best prediction to show on Home / Statistics for ``today``.

    Prefer a forecast already run today (predicts tomorrow). Otherwise fall
    back to the prediction *for* today (usually from yesterday's check-in).
    """
    today = today or date.today()
    from_today = get_forecast(db, user_id, run_on=today)
    if from_today is not None:
        return from_today
    return get_forecast(db, user_id, targeting=today)
