"""Run Elena ML prediction with GINA cold-start fallback."""

from __future__ import annotations

from pydantic import BaseModel, Field

from model.inference import (
    elena_model_available,
    predict_app_gina_fallback,
    predict_gina_fallback,
)


class PatientInput(BaseModel):
    """Inputs for prediction. Elena ML path requires full encoded features (TBD)."""

    # App GINA fields (cold-start)
    sens_cold: float = Field(0.5, ge=0.0, le=1.0)
    sens_pollen: float = Field(0.5, ge=0.0, le=1.0)
    sens_dust: float = Field(0.5, ge=0.0, le=1.0)
    temp_change: float
    aqi: float = Field(..., ge=0)
    humidity: float = Field(..., ge=0, le=100)
    pollen_level: int = Field(0, ge=0, le=2)
    cough_today: int = Field(0, ge=0, le=1)
    inhaler_today: int = Field(0, ge=0, le=3)
    sleep_hours: float = Field(..., ge=0)
    steps: float = Field(..., ge=0)
    baseline_sleep_hours: float | None = Field(None, ge=0)
    baseline_steps: float | None = Field(None, ge=0)
    
    # Legacy GINA fields (full clinical)
    force_gina: bool = False
    night_symp: bool | None = None
    day_symp: bool | None = None
    limit_activity: bool | None = None
    relief_inhaler_puffs: int | None = None
    pef_am: float | None = None
    pef_personal_best: float | None = None
    pollen: float | None = None
    temp: float | None = None
    
    # Elena ML fields (BLOCKED on model export - see model/elena_features.py)
    # When Elena exports elena_global_model.joblib + feature_columns.json:
    # - Add watch lag fields: sleep_minutes_lag, sedentary_minutes_lag, running_minutes_lag, 
    #   total_steps_lag, avg_hr_lag
    # - Add env dict (19 columns from /env/daily) or lat/lon/date for auto-fetch
    # - Add user static fields: sex, age_range, severity (if in feature_columns.json)
    # - Wire build_elena_feature_row() → predict_elena_ml() in run_prediction()


def _legacy_gina_fields_complete(inputs: PatientInput) -> bool:
    return all(
        v is not None
        for v in (
            inputs.night_symp,
            inputs.day_symp,
            inputs.limit_activity,
            inputs.relief_inhaler_puffs,
            inputs.pef_am,
            inputs.pef_personal_best,
            inputs.pollen,
            inputs.temp,
        )
    )


def run_prediction(inputs: PatientInput) -> dict:
    """
    Predict tomorrow flare risk.

    BLOCKED on Elena model export (see model/elena_features.py):
    - saved_models/elena_global_model.joblib
    - saved_models/feature_columns.json
    
    Until exported, uses App GINA for cold start.
    """
    # Legacy GINA path (full clinical fields)
    if inputs.force_gina and _legacy_gina_fields_complete(inputs):
        return predict_gina_fallback(
            night_symp=inputs.night_symp,
            day_symp=inputs.day_symp,
            limit_activity=inputs.limit_activity,
            relief_inhaler_puffs=inputs.relief_inhaler_puffs,
            pef_am=inputs.pef_am,
            pef_personal_best=inputs.pef_personal_best,
            aqi=inputs.aqi,
            pollen=inputs.pollen,
            temp=inputs.temp,
        )

    # Elena ML path (BLOCKED - model not exported yet)
    # When elena_global_model.joblib + feature_columns.json exist:
    #   1. Check if inputs have watch lags + env dict (or lat/lon for auto-fetch)
    #   2. Call build_elena_feature_row() from model.elena_features
    #   3. Pass encoded DataFrame to predict_elena_ml()
    #   4. Return ML prediction with flare_probability
    # For now: fall back to App GINA
    
    if not elena_model_available() or inputs.force_gina:
        return predict_app_gina_fallback(
            cough_today=inputs.cough_today,
            inhaler_today=inputs.inhaler_today,
            aqi=inputs.aqi,
            pollen_level=inputs.pollen_level,
            temp_change=inputs.temp_change,
            sens_cold=inputs.sens_cold,
            sens_pollen=inputs.sens_pollen,
        )

    # Fallback to App GINA (model exists but inputs incomplete)
    return predict_app_gina_fallback(
        cough_today=inputs.cough_today,
        inhaler_today=inputs.inhaler_today,
        aqi=inputs.aqi,
        pollen_level=inputs.pollen_level,
        temp_change=inputs.temp_change,
        sens_cold=inputs.sens_cold,
        sens_pollen=inputs.sens_pollen,
    )
