"""Load trained model and run flare probability inference."""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from model.feature_contract import FEATURES, RISK_LEVEL_THRESHOLDS
from model.features import compute_normalized_from_baselines
from model.risk_engine import compute_risk

MODEL_PATH = Path(__file__).resolve().parent.parent / "saved_models" / "my_app_asthma_model.pkl"

_model_bundle: dict | None = None


def load_model_bundle() -> dict | None:
    """Load and cache the serialized model artifact if it exists."""
    global _model_bundle
    if _model_bundle is not None:
        return _model_bundle
    if not MODEL_PATH.exists():
        return None
    _model_bundle = joblib.load(MODEL_PATH)
    return _model_bundle


def _probability_to_risk_level(probability: float) -> str:
    if probability >= RISK_LEVEL_THRESHOLDS["High"]:
        return "High"
    if probability >= RISK_LEVEL_THRESHOLDS["Medium"]:
        return "Medium"
    return "Low"


def _top_contributing_features(
    model, feature_vector: pd.DataFrame, feature_names: list[str], top_k: int = 3
) -> list[str]:
    """Name features with highest importance-weighted magnitude as explainability hints."""
    importances = model.feature_importances_
    weighted = importances * feature_vector.iloc[0].abs().values
    order = np.argsort(weighted)[::-1][:top_k]
    return [feature_names[i] for i in order]


def build_ml_feature_vector(
    *,
    sens_cold: float,
    sens_pollen: float,
    sens_dust: float,
    temp_change: float,
    aqi: float,
    humidity: float,
    pollen_level: int,
    cough_today: int,
    inhaler_today: int,
    sleep_hours: float,
    steps: float,
    baseline_sleep_hours: float | None,
    baseline_steps: float | None,
) -> tuple[pd.DataFrame, dict, bool]:
    """Build the ordered feature row and metadata for XGBoost inference."""
    sleep_deviation, steps_ratio, cold_start = compute_normalized_from_baselines(
        sleep_hours, steps, baseline_sleep_hours, baseline_steps
    )
    row = {
        "sens_cold": sens_cold,
        "sens_pollen": sens_pollen,
        "sens_dust": sens_dust,
        "temp_change": temp_change,
        "aqi": aqi,
        "humidity": humidity,
        "pollen_level": pollen_level,
        "cough_today": cough_today,
        "inhaler_today": inhaler_today,
        "sleep_deviation": sleep_deviation,
        "steps_ratio": steps_ratio,
    }
    inputs = {
        **row,
        "sleep_hours": sleep_hours,
        "steps": steps,
        "baseline_sleep_hours": baseline_sleep_hours,
        "baseline_steps": baseline_steps,
    }
    return pd.DataFrame([row])[FEATURES], inputs, cold_start


def predict_flare_ml(
    *,
    sens_cold: float,
    sens_pollen: float,
    sens_dust: float,
    temp_change: float,
    aqi: float,
    humidity: float,
    pollen_level: int,
    cough_today: int,
    inhaler_today: int,
    sleep_hours: float,
    steps: float,
    baseline_sleep_hours: float | None = None,
    baseline_steps: float | None = None,
) -> dict:
    """Return tomorrow flare probability from the trained XGBoost model."""
    bundle = load_model_bundle()
    if bundle is None:
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}")

    model = bundle["model"]
    feature_names = bundle.get("features", FEATURES)
    X, inputs, cold_start = build_ml_feature_vector(
        sens_cold=sens_cold,
        sens_pollen=sens_pollen,
        sens_dust=sens_dust,
        temp_change=temp_change,
        aqi=aqi,
        humidity=humidity,
        pollen_level=pollen_level,
        cough_today=cough_today,
        inhaler_today=inhaler_today,
        sleep_hours=sleep_hours,
        steps=steps,
        baseline_sleep_hours=baseline_sleep_hours,
        baseline_steps=baseline_steps,
    )

    probability = float(model.predict_proba(X)[0, 1])
    risk_level = _probability_to_risk_level(probability)
    top_features = _top_contributing_features(model, X, feature_names)

    return {
        "prediction_mode": "ml",
        "flare_probability": round(probability, 4),
        "risk_level": risk_level,
        "top_features": top_features,
        "triggered_rules": [
            f"ML model: P(flare tomorrow)={probability:.0%}",
            f"Top signals: {', '.join(top_features)}",
        ],
        "cold_start": cold_start,
        "inputs": inputs,
    }


def predict_gina_fallback(
    *,
    night_symp: bool,
    day_symp: bool,
    limit_activity: bool,
    relief_inhaler_puffs: int,
    pef_am: float,
    pef_personal_best: float,
    aqi: float,
    pollen: float,
    temp: float,
) -> dict:
    """Run GINA rule engine for cold-start users without wearable baselines."""
    result = compute_risk(
        night_symp=night_symp,
        day_symp=day_symp,
        limit_activity=limit_activity,
        relief_inhaler_puffs=relief_inhaler_puffs,
        pef_am=pef_am,
        pef_personal_best=pef_personal_best,
        aqi=aqi,
        pollen=pollen,
        temp=temp,
    )
    result["prediction_mode"] = "gina"
    result["flare_probability"] = None
    result["top_features"] = result.get("triggered_rules", [])
    result["cold_start"] = True
    return result
