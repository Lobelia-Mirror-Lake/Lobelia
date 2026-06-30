from fastapi import FastAPI, HTTPException, Query

from api.env import EnvDailyResponse, get_env_daily
from api.interpreter import interpret_risk
from api.predict import PatientInput, health_status, run_classifier_prediction, run_prediction
from api.schemas import ClassifierInput

app = FastAPI(
    title="Asthma Flare-up Prediction API",
    description=(
        "Predict tomorrow's asthma flare-up. "
        "POST /predict/classifier uses the trained XGBoost model (strategy 2: "
        "nullable sensor fields map to NaN, not zero; no peak flow). "
        "POST /predict is GINA cold-start for new users."
    ),
    version="1.0.0",
)


@app.get("/health")
async def health() -> dict:
    return health_status()


@app.post("/predict/classifier")
async def predict_classifier_endpoint(
    inputs: ClassifierInput,
    include_advice: bool = Query(False, description="Add Claude plain-English advice (needs ANTHROPIC_API_KEY)"),
) -> dict:
    try:
        result = run_classifier_prediction(inputs)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if include_advice:
        try:
            result["advice"] = await interpret_risk(result)
        except ValueError as exc:
            result["advice"] = None
            result["advice_error"] = str(exc)

    return result


@app.post("/predict")
async def predict(
    inputs: PatientInput,
    include_advice: bool = Query(False, description="Add Claude plain-English advice (needs ANTHROPIC_API_KEY)"),
) -> dict:
    result = run_prediction(inputs)

    if include_advice:
        try:
            result["advice"] = await interpret_risk(result)
        except ValueError as exc:
            result["advice"] = None
            result["advice_error"] = str(exc)

    return result
