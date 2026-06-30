"""Fetch daily environment features in Elena / AAMOS schema."""

from __future__ import annotations

import os
from datetime import date, datetime
from typing import Protocol

from model.elena_env_schema import AAMOS_FALLBACK, ENV_FEATURE_COLUMNS, validate_env_features

# In-memory cache: {(lat_rounded, lon_rounded, date, provider): (response, timestamp)}
_env_cache: dict[tuple, tuple[dict, datetime]] = {}


class EnvProvider(Protocol):
    async def fetch_daily(self, lat: float, lon: float, day: date) -> dict: ...


async def fetch_env_daily(
    lat: float,
    lon: float,
    day: date | None = None,
    provider: str | None = None,
) -> dict:
    """
    Return Elena-compatible env features for one calendar day.
    
    Caches results in memory with TTL: 6h for today, 7d for past dates.
    """
    day = day or date.today()
    provider_name = provider or os.getenv("ENV_PROVIDER", "openmeteo")
    
    # Round lat/lon to 2 decimals (~1 km grid)
    lat_rounded = round(lat, 2)
    lon_rounded = round(lon, 2)
    cache_key = (lat_rounded, lon_rounded, day, provider_name)
    
    # Check cache
    now = datetime.now()
    if cache_key in _env_cache:
        cached_response, cached_time = _env_cache[cache_key]
        ttl_seconds = int(os.getenv("ENV_CACHE_TTL_SECONDS", "21600"))  # 6h default
        
        # Use longer TTL for past dates (7 days)
        if day < date.today():
            ttl_seconds = 7 * 86400
        
        age_seconds = (now - cached_time).total_seconds()
        if age_seconds < ttl_seconds:
            cached_response["cached"] = True
            return cached_response

    # Fetch from provider
    if provider_name == "openmeteo":
        from services.providers.openmeteo import OpenMeteoEnvProvider

        raw = await OpenMeteoEnvProvider().fetch_daily(lat, lon, day)
    elif provider_name == "openweather":
        from services.providers.openweather import OpenWeatherEnvProvider

        raw = await OpenWeatherEnvProvider().fetch_daily(lat, lon, day)
    else:
        raise ValueError(f"Unknown ENV_PROVIDER: {provider_name}")

    features = {col: raw.get(col, AAMOS_FALLBACK.get(col)) for col in ENV_FEATURE_COLUMNS}
    missing = validate_env_features(features)

    response = {
        "date": day.isoformat(),
        "lat": lat,
        "lon": lon,
        "provider": provider_name,
        "features": features,
        "missing": missing,
        "cached": False,
    }
    
    # Store in cache
    _env_cache[cache_key] = (response.copy(), now)
    
    return response
