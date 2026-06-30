"""Environment data endpoint — Elena feature columns for a lat/lon/day."""

from __future__ import annotations

from datetime import date

from fastapi import HTTPException, Query
from pydantic import BaseModel, Field

from services.env_fetcher import fetch_env_daily


class EnvDailyResponse(BaseModel):
    date: str
    lat: float
    lon: float
    provider: str
    features: dict
    missing: list[str] = Field(default_factory=list)
    cached: bool = False


async def get_env_daily(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    day: date | None = Query(None, alias="date"),
    provider: str | None = Query(None, description="openmeteo (free) or openweather"),
) -> EnvDailyResponse:
    try:
        result = await fetch_env_daily(lat=lat, lon=lon, day=day, provider=provider)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Env provider error: {e}") from e
    return EnvDailyResponse(**result)
