from datetime import date

from fastapi import FastAPI, Query

from api.env import EnvDailyResponse, get_env_daily
from api.interpreter import interpret_risk
from api.predict import PatientInput, run_prediction

app = FastAPI(title="Asthma Flare-up Prediction API")


@app.get("/env/daily", response_model=EnvDailyResponse)
async def env_daily(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    day: date | None = Query(None, alias="date"),
    provider: str | None = Query(None, description="openmeteo (free) or openweather"),
) -> EnvDailyResponse:
    return await get_env_daily(lat=lat, lon=lon, day=day, provider=provider)


@app.post("/predict")
async def predict(inputs: PatientInput) -> dict:
    result = run_prediction(inputs)
    result["advice"] = await interpret_risk(result)
    return result
