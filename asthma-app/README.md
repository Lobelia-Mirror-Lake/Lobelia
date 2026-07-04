# Asthma Flare-up Prediction App

Predict **tomorrow's asthma flare-up** using **Elena's AAMOS-trained classifier**, served via FastAPI with GINA cold-start fallback for new users.

**Production config:** strategy 2 (XGBoost native NaN — keep missing feature values; only tomorrow's label required). **No peak flow (PEF)** in the classifier. API clients send `null` for unknown sensor fields; the server maps them to NaN (not `0`).

## Data download

This repository does not include the raw AAMOS CSV files. Download them from the Edinburgh DataShare page and place the extracted CSVs in `model/data/`:

1. Open http://datashare.ed.ac.uk/items/8478e384-fd1b-4a37-9555-0c6e1218e90b
2. Click **Download all files**
3. Extract the archive contents into `asthma-app/model/data/`

The notebook and feature engineering modules expect files named like `anonym_aamos00_dailyquestionnaire.csv`, `anonym_aamos00_environment.csv`, and so on. Peak flow CSVs are optional (not used in production training).

## Quick start

```bash
cd asthma-app

# 1. Start PostgreSQL locally (recommended)
docker compose up -d

# 2. Python env + dependencies
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit keys as needed

# 3. Create tables
python scripts/init_db.py

# 4. Run API
./run_api.sh
```

**Database options**

| Environment | Setup |
|-------------|--------|
| **Local dev** | `docker compose up -d` → `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mirror_lake` |
| **Staging / demo** | Supabase project → paste the pooler connection string into `DATABASE_URL` in `.env` |

The API starts even if PostgreSQL is down (warn-and-skip on startup). Check `GET /health` — `database.connected` shows whether DB routes will work.

### Run tests

```bash
docker compose up -d
pip install -r requirements.txt
./run_tests.sh          # fast tests, mocked APIs (default)
./run_live_tests.sh     # real OpenWeather / Pollen / LLM — needs .env keys
```

Default `pytest` skips live tests (`pytest.ini`: `-m "not live"`). Live tests call real external APIs and use keys from `.env`.

Tests use `mirror_lake_test` by default (`TEST_DATABASE_URL` to override). If PostgreSQL is unavailable, DB tests are skipped.

**If you see `ModuleNotFoundError: No module named 'api'`** you started uvicorn from the repo root (`Mirror-Lake/`). `cd asthma-app` first, or use `./run_api.sh`.

Open http://127.0.0.1:8000/docs for interactive API docs.

### Check LLM advice manually

```bash
./check_llm_advice.sh                              # direct LLM call (uses .env keys)
./check_llm_advice.sh --provider gemini --risk High --puffs 2
./check_llm_advice.sh --api                        # full flow via running API
./check_llm_advice.sh --api --lat 42.36 --lon -71.06
./check_llm_advice.sh --json > advice.json         # save raw JSON
```

Direct mode skips the server and calls Gemini/Claude with a sample scenario. `--api` registers a temp user, logs a puff, and runs `POST /v1/forecast` with real env data.

### Classifier prediction (`POST /predict/classifier`)

Requires the trained artifact at `model/artifacts/flare_classifier.joblib`. Send today's environment, optional lagged sensor features (`null` if unknown), and today's flare status (or symptom fields to derive it). Returns tomorrow's flare probability.

Optional sensor / forecast fields: `sleep_minutes_lag`, `sedentary_minutes_lag`, `running_minutes_lag`, `total_steps_lag`, `avg_hr_lag`, `temp_diff_tomorrow`, `is_flare_up`. Omit or send JSON `null` — **do not use `0` for missing data**.

```bash
curl -s http://127.0.0.1:8000/health

curl -s -X POST http://127.0.0.1:8000/predict/classifier \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 12.5,
    "temperature_min": 8.0,
    "temperature_max": 15.0,
    "pressure": 1012.0,
    "humidity": 72.0,
    "wind_speed": 3.5,
    "wind_deg": 210.0,
    "aqi": 45.0,
    "co": 0.2,
    "no": 5.0,
    "no2": 12.0,
    "o3": 30.0,
    "so2": 2.0,
    "pm2_5": 18.0,
    "pm10": 25.0,
    "nh3": 0.5,
    "grass_pollen": "Low",
    "tree_pollen": "Moderate",
    "weed_pollen": "Low",
    "sleep_minutes_lag": 420,
    "total_steps_lag": 6500,
    "is_flare_up": 0
  }'
```

Add `?include_advice=true` for Claude-generated advice (requires `ANTHROPIC_API_KEY` in `.env`).

### GINA cold start (`POST /predict`)

Simpler inputs for new users without full AAMOS feature history.

## Repo layout

| Path | Role |
|------|------|
| `model/risk_engine.py` | GINA + App cold-start rules |
| `model/inference.py` | Classifier + GINA routing |
| `model/feature_engineering.py` | Shared data preparation helpers |
| `model/model.py` | XGBoost model helpers |
| `model/train.py` | Population and personalized training routines |
| `model/inference_new.py` | Notebook-friendly inference helpers |
| `model/artifacts/flare_classifier.joblib` | Trained global classifier (local) |
| `api/` | FastAPI legacy `/predict/*` + `/v1` product APIs |
| `db/` | PostgreSQL models and session management |
| `docker-compose.yml` | Local PostgreSQL 16 for development |
| `tests/` | Pytest suite (auth, check-ins, forecast, advice) |
| `model/data/` | AAMOS raw CSVs (local, gitignored) |
| `docs/ELENA_HANDOFF.md` | What Elena exports for deploy |
| `docs/API.md` | Backend API spec for frontend + new endpoints |
| `docs/ENV_API_DESIGN.md` | Environment fetch design (OpenWeather / pollen) |
| `notebooks/Asthma_Prediction_Model.ipynb` | Research notebook rebuilt to use the shared modules |
| `../Asthma_binary.ipynb` | Elena's binary + Edge notebook (Elena branch) |

## Cold start

New users without full sensor/environment history can use **POST /predict** (App GINA). Users with complete daily features should use **POST /predict/classifier**.
