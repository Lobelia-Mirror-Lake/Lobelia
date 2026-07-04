"""Forecast endpoint — tomorrow risk + bundled advice."""

from __future__ import annotations

from datetime import date as Date
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.deps import get_current_user
from db.database import get_db
from db.models import User
from services.forecast_service import run_forecast

router = APIRouter(prefix="/forecast", tags=["forecast"])


class ForecastRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    date: Optional[Date] = None
    llm_provider: Optional[Literal["claude", "gemini"]] = None


@router.post("")
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
    )
