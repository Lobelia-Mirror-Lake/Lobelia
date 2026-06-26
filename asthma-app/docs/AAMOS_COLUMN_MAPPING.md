# AAMOS / Elena CSV → App Feature Mapping

For `model/adapt_aamos.py` when `daily_merged.csv` arrives.

| Source column (Elena) | App feature | Transform |
|----------------------|-------------|-----------|
| `temperature` | `temp_change` | `groupby(user_key).diff()` |
| `aqi` | `aqi` | direct |
| `humidity` | `humidity` | direct |
| `grass_pollen`, `tree_pollen`, `weed_pollen` | `pollen_level` | encode High/Moderate/Low → 0/1/2, take max |
| `severity` | `sens_cold`, `sens_pollen`, `sens_dust` | map 1–3 → 0.2–1.0 (see adapt_asthsist) |
| `daily_night_symp` or `daily_day_symp` | `cough_today` | `(night \| day).astype(int)` |
| `daily_relief_inhaler` | `inhaler_today` | `clip(0, 3)` |
| `sleep_minutes` | `sleep_hours` | `/ 60` |
| `total_steps` | `steps` | direct |
| `sleep_hours`, `steps` | `sleep_deviation`, `steps_ratio` | per-user mean baseline via `engineer_personalized_features` |
| `symptom_score` (shift -1) | `tomorrow_flare` | personalized: `>= user_median + 2` |

Columns not in App contract (research only): `pef_pct_best_lag1`, `pef_change`, `avg_hr_lag`, `running_minutes_lag`.
