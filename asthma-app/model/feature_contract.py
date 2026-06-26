"""Single source of truth for App-realistic flare prediction schema."""

from __future__ import annotations

STATIC_FEATURES = ["sens_cold", "sens_pollen", "sens_dust"]
ENVIRONMENT_FEATURES = ["temp_change", "aqi", "humidity", "pollen_level"]
SYMPTOM_FEATURES = ["cough_today", "inhaler_today"]
NORMALIZED_FEATURES = ["sleep_deviation", "steps_ratio"]

FEATURES = STATIC_FEATURES + ENVIRONMENT_FEATURES + SYMPTOM_FEATURES + NORMALIZED_FEATURES
TARGET = "tomorrow_flare"
GROUP_COL = "user_key"

BASELINE_SOURCE_COLUMNS = {"sleep": "sleep_hours", "steps": "steps"}

# Raw columns required before personalized feature engineering
RAW_INPUT_COLUMNS = [
    "sens_cold",
    "sens_pollen",
    "sens_dust",
    "temp_change",
    "aqi",
    "humidity",
    "pollen_level",
    "cough_today",
    "inhaler_today",
    "sleep_hours",
    "steps",
]

RISK_LEVEL_THRESHOLDS = {"High": 0.70, "Medium": 0.40}
