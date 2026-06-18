from fastapi import FastAPI

from api.interpreter import interpret_risk
from api.predict import PatientInput, run_prediction

app = FastAPI(title="Asthma Flare-up Prediction API")


@app.post("/predict")
async def predict(inputs: PatientInput) -> dict:
    result = run_prediction(inputs)
    result["advice"] = await interpret_risk(result)
    return result
