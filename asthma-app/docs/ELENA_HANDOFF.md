# Elena CSV Handoff Contract

Use this when Elena exports `daily_merged.csv` from `Asthma_Prediction_Model.ipynb`.

## Required columns

| Column | Purpose |
|--------|---------|
| `user_key` | Patient ID for GroupKFold |
| `date` | Study day index |
| `symptom_score` | Tomorrow regression target (Elena's track) |
| `daily_night_symp` | Raw symptom component |
| `daily_day_symp` | Raw symptom component |
| `daily_limit_activity` | Raw symptom component |
| `daily_prev_inhaler` | Raw symptom component |
| `daily_relief_inhaler` | Raw symptom component |
| `temperature` or `temp` | Environment |
| `aqi` | Environment |
| `humidity` | Environment |
| `grass_pollen`, `tree_pollen`, `weed_pollen` | Optional; map to `pollen_level` |
| `sleep_minutes` or `sleep_hours` | Wearable |
| `total_steps` or `Sum_steps` | Wearable |

## Optional (research only, not App model)

- `pef_pct_best_lag1`, `pef_change`, `avg_hr_lag`, `running_minutes_lag`

## Personalized flare label (product track)

Agreed definition for binary classification:

```text
user_baseline = median(symptom_score) per user (first N days or expanding window)
tomorrow_flare = 1  if  tomorrow_symptom_score >= user_baseline + 2
tomorrow_flare = 0  otherwise
```

This avoids a single global threshold that treats mild and severe patients the same.

## What we do not wait for

Real-data checks use Asthsist (`adapt_asthsist.py`) and **local AAMOS raw merge** (`adapt_aamos.py`) today.

If Elena exports `daily_merged.csv` with smartwatch columns, place it at `data/aamos_merged_daily.csv` and re-run `python -m model.adapt_aamos` — it will load her file instead of rebuilding from raw.

## Message template for Elena

> Hi Elena — when you export `daily_merged.csv`, please include `user_key`, `date`, `symptom_score`, the five daily symptom/inhaler columns, environment fields, and daily sleep/steps. For flare alignment we'll use personalized labels: tomorrow_flare = 1 if tomorrow symptom_score >= that user's median + 2. I'm not blocked on your CSV (using Asthsist bridge for now); your file lets us compare your regression vs my App classifier on the same patients.
