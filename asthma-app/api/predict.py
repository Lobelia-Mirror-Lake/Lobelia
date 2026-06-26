"""Run ML flare prediction with GINA cold-start fallback."""

from __future__ import annotations

from pydantic import BaseModel, Field

from model.inference import predict_app_gina_fallback, predict_flare_ml, predict_gina_fallback


class PatientInput(BaseModel):
    """App-realistic inputs aligned with model/feature_contract.py."""

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
    force_gina: bool = False
    night_symp: bool | None = None
    day_symp: bool | None = None
    limit_activity: bool | None = None
    relief_inhaler_puffs: int | None = None
    pef_am: float | None = None
    pef_personal_best: float | None = None
    pollen: float | None = None
    temp: float | None = None


def _baselines_missing(inputs: PatientInput) -> bool:
    return inputs.baseline_sleep_hours is None or inputs.baseline_steps is None


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

    Routing:
    - force_gina or missing baselines -> App GINA (no PEF) by default
    - legacy full GINA when all clinical fields supplied and force_gina=True
    - otherwise -> XGBoost ML (uses neutral sleep/steps when baselines absent)
    """
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

    if _baselines_missing(inputs) or inputs.force_gina:
        return predict_app_gina_fallback(
            cough_today=inputs.cough_today,
            inhaler_today=inputs.inhaler_today,
            aqi=inputs.aqi,
            pollen_level=inputs.pollen_level,
            temp_change=inputs.temp_change,
            sens_cold=inputs.sens_cold,
            sens_pollen=inputs.sens_pollen,
        )

    return predict_flare_ml(
        sens_cold=inputs.sens_cold,
        sens_pollen=inputs.sens_pollen,
        sens_dust=inputs.sens_dust,
        temp_change=inputs.temp_change,
        aqi=inputs.aqi,
        humidity=inputs.humidity,
        pollen_level=inputs.pollen_level,
        cough_today=inputs.cough_today,
        inhaler_today=inputs.inhaler_today,
        sleep_hours=inputs.sleep_hours,
        steps=inputs.steps,
        baseline_sleep_hours=inputs.baseline_sleep_hours,
        baseline_steps=inputs.baseline_steps,
    )
