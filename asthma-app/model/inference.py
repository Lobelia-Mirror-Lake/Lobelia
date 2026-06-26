"""Inference: Elena global model (when available) and GINA cold-start fallbacks."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd

from model.risk_engine import compute_app_risk, compute_risk

SAVED_MODELS = Path(__file__).resolve().parent.parent / "saved_models"
ELENA_MODEL_PATH = SAVED_MODELS / "elena_global_model.joblib"
ELENA_FEATURES_PATH = SAVED_MODELS / "feature_columns.json"

RISK_LEVEL_THRESHOLDS = {"High": 0.70, "Medium": 0.40}

_elena_model = None
_elena_feature_columns: list[str] | None = None


def elena_model_available() -> bool:
    """True when Elena has exported model + encoded feature column list."""
    return ELENA_MODEL_PATH.exists() and ELENA_FEATURES_PATH.exists()


def _load_elena_artifacts() -> tuple[object, list[str]]:
    global _elena_model, _elena_feature_columns
    if _elena_model is None or _elena_feature_columns is None:
        if not elena_model_available():
            raise FileNotFoundError(
                f"Elena model not found. Expected:\n"
                f"  {ELENA_MODEL_PATH}\n"
                f"  {ELENA_FEATURES_PATH}\n"
                "Export from Asthma_binary.ipynb (see docs/ELENA_HANDOFF.md)."
            )
        _elena_model = joblib.load(ELENA_MODEL_PATH)
        with open(ELENA_FEATURES_PATH) as f:
            _elena_feature_columns = json.load(f)
    return _elena_model, _elena_feature_columns


def _probability_to_risk_level(probability: float) -> str:
    if probability >= RISK_LEVEL_THRESHOLDS["High"]:
        return "High"
    if probability >= RISK_LEVEL_THRESHOLDS["Medium"]:
        return "Medium"
    return "Low"


def predict_elena_ml(encoded_features: pd.DataFrame) -> dict:
    """
    Run Elena's global XGBClassifier on a pre-encoded feature row.

    `encoded_features` must match columns from feature_columns.json (after get_dummies).
    """
    model, feature_columns = _load_elena_artifacts()
    aligned = encoded_features.reindex(columns=feature_columns, fill_value=0)
    probability = float(model.predict_proba(aligned)[0, 1])
    risk_level = _probability_to_risk_level(probability)

    return {
        "prediction_mode": "elena_ml",
        "flare_probability": round(probability, 4),
        "risk_level": risk_level,
        "top_features": [],
        "triggered_rules": [f"Elena model: P(flare tomorrow)={probability:.0%}"],
        "cold_start": False,
        "inputs": aligned.iloc[0].to_dict(),
    }


def predict_app_gina_fallback(
    *,
    cough_today: int,
    inhaler_today: int,
    aqi: float,
    pollen_level: int,
    temp_change: float,
    sens_cold: float = 0.5,
    sens_pollen: float = 0.5,
) -> dict:
    """GINA-style rules for cold-start users without Elena's full feature history."""
    result = compute_app_risk(
        cough_today=cough_today,
        inhaler_today=inhaler_today,
        aqi=aqi,
        pollen_level=pollen_level,
        temp_change=temp_change,
        sens_cold=sens_cold,
        sens_pollen=sens_pollen,
    )
    result["prediction_mode"] = "gina_app"
    result["flare_probability"] = None
    result["top_features"] = result.get("triggered_rules", [])
    result["cold_start"] = True
    return result


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
    """Full GINA rules when legacy clinical fields are supplied."""
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
