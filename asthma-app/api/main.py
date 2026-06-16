from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Asthma Flare-up Prediction API")


class PredictRequest(BaseModel):
    """Placeholder request body for flare-up prediction."""

    pass


class PredictResponse(BaseModel):
    """Placeholder response for flare-up prediction."""

    message: str


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest) -> PredictResponse:
    return PredictResponse(message="placeholder")
