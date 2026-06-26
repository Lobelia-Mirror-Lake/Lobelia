# Edge AI Inference Spec

ONNX model: `saved_models/my_app_asthma_model.onnx`  
Export: `python -m model.export_onnx`

## Input vector (11 floats, strict order)

| Index | Feature | Description |
|-------|---------|-------------|
| 0 | `sens_cold` | Cold-air sensitivity 0.0–1.0 |
| 1 | `sens_pollen` | Pollen sensitivity 0.0–1.0 |
| 2 | `sens_dust` | Dust/AQI sensitivity 0.0–1.0 |
| 3 | `temp_change` | 24h temperature change (°C) |
| 4 | `aqi` | Air quality index |
| 5 | `humidity` | Relative humidity (%) |
| 6 | `pollen_level` | 0=none, 1=low, 2=high |
| 7 | `cough_today` | 0 or 1 |
| 8 | `inhaler_today` | 0–3 rescue uses |
| 9 | `sleep_deviation` | sleep_hours − baseline_sleep_hours |
| 10 | `steps_ratio` | steps / (baseline_steps + 1e-5) |

## On-device feature engineering

```python
if baseline_sleep_hours is None or baseline_steps is None:
    sleep_deviation = 0.0
    steps_ratio = 1.0
    cold_start = True
else:
    sleep_deviation = sleep_hours - baseline_sleep_hours
    steps_ratio = steps / (baseline_steps + 1e-5)
    cold_start = False
```

Store baselines locally (Keychain / SQLite). Do not upload raw sleep/steps if privacy is required.

## Output

- ONNX `predict_proba` → probability of class 1 (`tomorrow_flare`)
- Risk levels:
  - High: probability ≥ 0.70
  - Medium: probability ≥ 0.40
  - Low: probability < 0.40

## Cold start (no baselines)

Use App GINA rules on device (`compute_app_risk` in `model/risk_engine.py`) — no PEF required. Switch to ONNX ML once 7–14 days of baseline history exist.

## Parity requirement

Python XGBoost vs ONNX max probability difference must be < 1e-4 (checked in `export_onnx.py`).
