"""Train XGBoost model on AAMOS-00 data."""

from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
MODEL_DIR = Path(__file__).resolve().parent.parent / "saved_models"


def main() -> None:
    """Load data, engineer features, train model, and save artifact."""
    raise NotImplementedError


if __name__ == "__main__":
    main()
