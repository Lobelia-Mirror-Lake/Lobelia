# Professor Brief: Asthma Flare Prediction Methodology

## Problem statement

We predict **tomorrow's asthma flare-up probability** from signals a consumer App can
realistically collect: environment (auto), wearables (passive), and a 2-second daily
check-in. We deliberately **do not** use research-grade burdens such as daily PEF
measurements or multi-page clinical questionnaires (AAMOS-00, AsthsistPlus raw merge).

## Why we left AAMOS-00 / academic datasets

| Issue | Impact |
|-------|--------|
| PEF required on most days | 55%+ missing after merge; not sustainable in consumer App |
| Same-day label leakage | Features overlapped label definition → fake AUC ≈ 1.0 |
| Weekly ACQ forward-fill | 95%+ positive class → unusable labels |

Design decision: **App-realistic feature contract** documented in
[`model/feature_contract.md`](../model/feature_contract.md).

## Model architecture

```text
Today's inputs → personalized features → XGBoost → P(tomorrow_flare) → RAG advice
                      ↑
              sleep_deviation, steps_ratio
              (vs user baseline, not population mean)
```

**Evaluation:** 5-fold **GroupKFold** by `user_key` — the same patient never appears
in both train and validation (prevents memorizing patient identity).

## Results to report (honest expectations)

| Track | Data | OOF AUC | Interpretation |
|-------|------|---------|----------------|
| Synthetic (pipeline proof) | 500 users × 40 days, personalized susceptibility | **~0.63** | Pipeline works; not clinical validation |
| Asthsist bridge (sanity check) | 991 AAMOS rows → proxy label (next-day PEF zone) | **~0.50–0.65** | Real structure, small N, imputed fields |

**Do not report** synthetic AUC > 0.9 — that indicates label leakage, not skill.

Run synthetic evaluation:

```bash
python model/generate_app_data.py
python model/train_my_app_model.py
```

Run real-structure sanity check:

```bash
python model/adapt_asthsist.py
```

## External GitHub resources (how we used them)

| Resource | Role | Not used for |
|----------|------|--------------|
| [ResearchKit/AsthmaHealth](https://github.com/ResearchKit/AsthmaHealth) | Survey UX, task scheduling, HealthKit patterns | Training data (none published) |
| [MeenVP/AsthsistPlus](https://github.com/MeenVP/AsthsistPlus) | Merge notebook reference; `Clean_data_2.csv` for proxy-label sanity check | Direct training (PEF-dependent, N≈991) |
| [asthma-detection topic](https://github.com/topics/asthma-detection) | Class imbalance / CV patterns | Tomorrow flare datasets (wrong problem type) |

## Production inference

- **Primary:** XGBoost model (`saved_models/my_app_asthma_model.pkl`)
- **Fallback:** GINA rule engine for cold-start users with symptom + PEF inputs
- **Explanation:** Claude LLM receives risk level, probability, top features → plain-English advice

API example (ML path):

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sens_cold": 0.8, "sens_pollen": 0.6, "sens_dust": 0.7,
    "temp_change": -7, "aqi": 180, "humidity": 65, "pollen_level": 2,
    "cough_today": 1, "inhaler_today": 2,
    "sleep_hours": 5.0, "steps": 3000,
    "baseline_sleep_hours": 7.0, "baseline_steps": 8000
  }'
```

## Next steps for clinical credibility

1. **Pilot collection:** 20–30 users × 30 days with App-realistic fields only
2. **Replace proxy labels** with clinician- or patient-validated flare events
3. **Prospective evaluation:** train on weeks 1–4, test on week 5+ per user

## Key takeaway for review

We are not stuck on "unable to train." We have a **methodologically sound pipeline**
(GroupKFold, personalized normalization, no leakage) with **realistic AUC (~0.63)** on
synthetic data. The gap is **labeled real-world App data**, not missing code.
