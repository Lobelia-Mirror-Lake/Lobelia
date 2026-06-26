# Evaluation Results (Pre-Elena Integration)

Last updated: 2026-06-16

## Summary

| Track | Script | OOF AUC | Std | Notes |
|-------|--------|---------|-----|-------|
| Synthetic | `model/train_my_app_model.py` | **0.6341** | 0.0130 | 500 users × 40 days; pipeline proof |
| Asthsist bridge | `model/adapt_asthsist.py` | **0.7073** | 0.0940 | 14 users, 678 days; proxy label (PEF zone) |
| AAMOS merge (Elena logic) | `model/adapt_aamos.py` | **0.6930** | 0.0742 | 22 users, 1495 days; personalized flare label |

Asthsist `Clean_data_2.csv` is the real-data sanity check without Elena's CSV export.
**AAMOS integration** builds `data/aamos_merged_daily.csv` from local `data/raw/` (daily + environment + severity) when Elena has not exported yet. Sleep/steps imputed until smartwatch raw files are added.

## Synthetic track (detail)

```
Fold 1 - Validation AUC: 0.6548
Fold 2 - Validation AUC: 0.6367
Fold 3 - Validation AUC: 0.6148
Fold 4 - Validation AUC: 0.6281
Fold 5 - Validation AUC: 0.6363
OOF Mean AUC-ROC: 0.6341 (Std: 0.0130)
Tomorrow flare rate: 23.4%
```

Top features: `inhaler_today`, `cough_today`, `pollen_level`, `temp_change`.

## Asthsist bridge (detail)

```
Raw rows: 990 -> daily rows: 680 -> usable: 678
Users: 14
Proxy label rate: 44.5%
Fold 1 - Validation AUC: 0.6385
Fold 2 - Validation AUC: 0.8523
Fold 3 - Validation AUC: 0.5838
Fold 4 - Validation AUC: 0.6987
Fold 5 - Validation AUC: 0.7631
OOF Mean AUC: 0.7073 (Std: 0.0940)
```

Limitations: `pollen_level`, `sleep_hours`, `cough_today` are imputed/proxied; label is PEF zone not clinical flare.

## AAMOS merge — Elena notebook logic (detail)

```
Built from data/raw/ (Elena has not exported daily_merged.csv yet)
Rows: 1500 merged -> 1495 usable
Users: 22
Personalized flare rate: 20.4%
Fold 1 - Validation AUC: 0.6804
Fold 2 - Validation AUC: 0.6848
Fold 3 - Validation AUC: 0.7241
Fold 4 - Validation AUC: 0.8023
Fold 5 - Validation AUC: 0.5731
OOF Mean AUC: 0.6930 (Std: 0.0742)
```

Limitations: no local smartwatch CSVs — sleep/steps imputed. Re-run after Elena exports merge with `sleep_minutes`/`total_steps`.

## API demo (curl)

### Warm user — ML path

```bash
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sens_cold": 0.8, "sens_pollen": 0.6, "sens_dust": 0.7,
    "temp_change": -7, "aqi": 180, "humidity": 65, "pollen_level": 2,
    "cough_today": 1, "inhaler_today": 2,
    "sleep_hours": 5.0, "steps": 3000,
    "baseline_sleep_hours": 7.0, "baseline_steps": 8000
  }'
```

Expect: `prediction_mode: "ml"`, `cold_start: false`, `flare_probability` present.

### Cold-start user — App GINA (no PEF, no baselines)

```bash
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "temp_change": -8, "aqi": 150, "humidity": 70, "pollen_level": 2,
    "cough_today": 1, "inhaler_today": 3,
    "sleep_hours": 6.0, "steps": 4000,
    "sens_cold": 0.9, "sens_pollen": 0.7
  }'
```

Expect: `prediction_mode: "gina_app"`, `cold_start: true`, `flare_probability: null`.

## Edge export

```bash
python -m model.export_onnx
```

ONNX parity: Python vs ONNX max diff = 0.0 on sample vector. See [`docs/EDGE_SPEC.md`](EDGE_SPEC.md).

## Reproduce

```bash
cd asthma-app
python -m model.generate_app_data
python -m model.train_my_app_model
python -m model.adapt_asthsist
python -m model.adapt_aamos
python -m model.export_onnx
uvicorn api.main:app --reload
```
