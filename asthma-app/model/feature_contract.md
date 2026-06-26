# App Feature Contract (Gold Standard)

This document is the **only** authoritative schema for training, inference, and API
payloads. Do not add PEF, ACQ, or AAMOS daily-questionnaire fields here.

## Prediction task

- **Input:** signals collected today (evening check-in + passive sync).
- **Output:** `P(tomorrow_flare)` — probability of asthma flare-up in the next 24 hours.

## Feature groups (model input order)

| Group | Features | Collection |
|-------|----------|------------|
| Static susceptibility | `sens_cold`, `sens_pollen`, `sens_dust` | Onboarding quiz (0.0–1.0) |
| Environment | `temp_change`, `aqi`, `humidity`, `pollen_level` | Backend weather API (0/1/2 pollen) |
| Symptoms | `cough_today`, `inhaler_today` | One-tap daily check-in |
| Normalized physiology | `sleep_deviation`, `steps_ratio` | Derived from wearables + user baseline |

Full model vector (strict order):

```
sens_cold, sens_pollen, sens_dust,
temp_change, aqi, humidity, pollen_level,
cough_today, inhaler_today,
sleep_deviation, steps_ratio
```

## Raw API / CSV columns (before engineering)

| Column | Type | Description |
|--------|------|-------------|
| `user_key` | str | Patient identifier |
| `sens_cold` | float | Cold-air sensitivity |
| `sens_pollen` | float | Pollen sensitivity |
| `sens_dust` | float | Dust/AQI sensitivity |
| `temp_change` | float | 24h temperature change (°C); negative = drop |
| `aqi` | float | Air quality index |
| `humidity` | float | Relative humidity (%) |
| `pollen_level` | int | 0=none, 1=low, 2=high |
| `sleep_hours` | float | Last night sleep duration |
| `steps` | float | Today step count |
| `cough_today` | int | 0=no, 1=yes |
| `inhaler_today` | int | 0–3+ rescue inhaler uses |
| `tomorrow_flare` | int | Label: 1=flare next day (training only) |

## Personalized normalization

Computed per user from rolling history (not population averages):

```python
sleep_deviation = sleep_hours - baseline_sleep_hours
steps_ratio = steps / (baseline_steps + 1e-5)
```

**Cold start:** if baselines are unknown, use `sleep_deviation=0`, `steps_ratio=1.0`
and set `cold_start=true` in API response, or fall back to GINA rules when legacy
symptom fields are provided.

## Risk levels (inference)

| Level | Flare probability |
|-------|---------------------|
| High | ≥ 0.70 |
| Medium | ≥ 0.40 |
| Low | < 0.40 |

## Files that must stay aligned

- `model/feature_contract.py` — constants imported by train/adapt/API code
- `model/generate_app_data.py` — synthetic data generator
- `model/train_my_app_model.py` — GroupKFold trainer
- `model/adapt_asthsist.py` — real-data sanity check (proxy labels)
- `api/predict.py` — inference + GINA fallback
