"""Evaluate trained model with AUC and recall metrics."""

from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / "saved_models"


def evaluate_model(model_path: Path, X_test, y_test) -> dict:
    """Return AUC and recall for the given model and holdout set."""
    raise NotImplementedError
