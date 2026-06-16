"""Load trained model and run inference."""

from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent.parent / "saved_models"


def load_model(model_name: str = "xgboost_model.pkl"):
    """Load a serialized model from saved_models/."""
    raise NotImplementedError


def predict_risk(features: dict) -> float:
    """Return flare-up risk score for the given features."""
    raise NotImplementedError
