"""Elena environment feature contract — matches AAMOS / Asthma_binary.ipynb."""

from __future__ import annotations

ENV_FEATURE_COLUMNS = [
    "temperature",
    "temperature_min",
    "temperature_max",
    "pressure",
    "humidity",
    "wind_speed",
    "wind_deg",
    "aqi",
    "co",
    "no",
    "no2",
    "o3",
    "so2",
    "pm2_5",
    "pm10",
    "nh3",
    "grass_pollen",
    "tree_pollen",
    "weed_pollen",
]

POLLEN_CATEGORIES = ("Low", "Moderate", "High", "Very High")
CATEGORICAL_POLLEN_COLS = ("grass_pollen", "tree_pollen", "weed_pollen")

# AAMOS medians for fallback when a provider omits a field
AAMOS_FALLBACK = {
    "aqi": 1,
    "co": 238.27,
    "no": 1.01,
    "no2": 8.52,
    "o3": 51.55,
    "so2": 2.20,
    "pm2_5": 5.08,
    "pm10": 6.76,
    "nh3": 1.28,
    "grass_pollen": "Low",
    "tree_pollen": "Low",
    "weed_pollen": "Low",
}


def us_aqi_to_openweather_band(us_aqi: float) -> int:
    """Map US AQI (0–500) to OpenWeather main.aqi band (1–5)."""
    if us_aqi <= 50:
        return 1
    if us_aqi <= 100:
        return 2
    if us_aqi <= 150:
        return 3
    if us_aqi <= 200:
        return 4
    return 5


def google_pollen_category(raw: str) -> str:
    """Google Pollen API uses UPPER_SNAKE; AAMOS uses title case."""
    mapping = {
        "LOW": "Low",
        "MODERATE": "Moderate",
        "HIGH": "High",
        "VERY_HIGH": "Very High",
    }
    return mapping.get(raw.upper().replace(" ", "_"), "Moderate")


def grains_to_pollen_category(grains: float) -> str:
    """Map pollen grains/m³ to AAMOS-style bucket (tune from AAMOS quantiles)."""
    if grains < 20:
        return "Low"
    if grains < 100:
        return "Moderate"
    if grains < 300:
        return "High"
    return "Very High"


def validate_env_features(features: dict) -> list[str]:
    """Return list of missing or invalid column names."""
    missing = []
    for col in ENV_FEATURE_COLUMNS:
        if col not in features or features[col] is None:
            missing.append(col)
            continue
        if col in CATEGORICAL_POLLEN_COLS and features[col] not in POLLEN_CATEGORIES:
            missing.append(col)
    return missing
