"""Export trained XGBoost model to ONNX for edge/on-device inference."""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import onnxruntime as ort
from onnxmltools.convert import convert_xgboost
from onnxmltools.convert.common.data_types import FloatTensorType

from model.feature_contract import FEATURES

MODEL_PATH = Path(__file__).resolve().parent.parent / "saved_models" / "my_app_asthma_model.pkl"
ONNX_PATH = Path(__file__).resolve().parent.parent / "saved_models" / "my_app_asthma_model.onnx"


def export_onnx(model_path: Path = MODEL_PATH, onnx_path: Path = ONNX_PATH) -> Path:
    """Convert saved XGBClassifier bundle to ONNX and validate parity."""
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found at {model_path}. Run train_my_app_model first.")

    bundle = joblib.load(model_path)
    model = bundle["model"]
    n_features = len(FEATURES)

    # ONNX converters expect numeric feature names (f0, f1, ...)
    booster = model.get_booster()
    booster.feature_names = [f"f{i}" for i in range(n_features)]

    initial_type = [("input", FloatTensorType([None, n_features]))]
    onnx_model = convert_xgboost(model, initial_types=initial_type, target_opset=12)

    onnx_path.parent.mkdir(parents=True, exist_ok=True)
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    sample = np.array(
        [[0.8, 0.6, 0.7, -7.0, 180.0, 65.0, 2.0, 1.0, 2.0, -2.0, 0.375]],
        dtype=np.float32,
    )
    python_prob = float(model.predict_proba(sample)[0, 1])

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: sample})
    onnx_prob = float(outputs[1][0, 1])

    max_diff = abs(python_prob - onnx_prob)
    print(f"Exported ONNX -> {onnx_path}")
    print(f"Python prob: {python_prob:.6f}  ONNX prob: {onnx_prob:.6f}  max_diff: {max_diff:.2e}")
    if max_diff > 1e-4:
        raise RuntimeError(f"ONNX parity check failed: max_diff={max_diff}")
    print("ONNX parity check passed.")
    return onnx_path


def main() -> None:
    export_onnx()


if __name__ == "__main__":
    main()
