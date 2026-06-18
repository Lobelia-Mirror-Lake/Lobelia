"""Run GINA rule-based risk prediction."""

from pydantic import BaseModel

from model.risk_engine import compute_risk


class PatientInput(BaseModel):
    night_symp: bool
    day_symp: bool
    limit_activity: bool
    relief_inhaler_puffs: int
    pef_am: float
    pef_personal_best: float
    aqi: float
    pollen: float
    temp: float


def run_prediction(inputs: PatientInput) -> dict:
    """Evaluate patient inputs with the GINA rule engine."""
    return compute_risk(**inputs.model_dump())
