"""Forecast endpoints — tomorrow risk + bundled advice + history."""

from __future__ import annotations

from datetime import date as Date
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.deps import get_current_user
from api.errors import api_error
from db.database import get_db
from db.models import User
from services.forecast_service import get_forecast_for_date, list_forecasts, run_forecast

router = APIRouter(tags=["forecast"])


class ForecastRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    date: Optional[Date] = None
    llm_provider: Optional[Literal["claude", "gemini"]] = None
    timezone: str = Field("America/Chicago", description="IANA timezone for Google Calendar day bounds")
    calendar_events: Optional[list[dict[str, Any]]] = Field(
        None,
        description="Optional structured events override (skips Google fetch when provided)",
    )


@router.post("/forecast")
async def create_forecast(
    body: ForecastRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return await run_forecast(
        db,
        user,
        lat=body.lat,
        lon=body.lon,
        anchor_date=body.date,
        llm_provider=body.llm_provider,
        calendar_events=body.calendar_events,
        timezone_name=body.timezone,
    )


@router.get("/forecasts/today")
def get_today_forecast(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    record = get_forecast_for_date(db, user.id, Date.today())
    if record is None:
        raise api_error(
            404,
            "No forecast found for today. Run POST /v1/forecast first.",
            "FORECAST_NOT_FOUND",
        )
    return record


@router.get("/forecasts")
def get_forecasts(
    from_date: Optional[Date] = Query(None, alias="from"),
    to_date: Optional[Date] = Query(None, alias="to"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return {
        "items": list_forecasts(db, user.id, from_date=from_date, to_date=to_date),
    }
