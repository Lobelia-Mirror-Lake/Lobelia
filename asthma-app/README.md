# Asthma Flare-up Prediction App

Predict **tomorrow's asthma flare-up** using **Elena's AAMOS-trained classifier**, served via FastAPI with GINA cold-start fallback for new users.

## Data download

This repository does not include the raw AAMOS CSV files. Download them from the Edinburgh DataShare page and place the extracted CSVs in `model/data/`:

1. Open http://datashare.ed.ac.uk/items/8478e384-fd1b-4a37-9555-0c6e1218e90b
2. Click **Download all files**
3. Extract the archive contents into `asthma-app/model/data/`

The notebook and feature engineering modules expect files named like `anonym_aamos00_peakflow.csv`, `anonym_aamos00_dailyquestionnaire.csv`, and so on.

## Quick start

```bash
cd asthma-app
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Place Elena's exports in saved_models/ (see docs/ELENA_HANDOFF.md)
#   saved_models/elena_global_model.joblib
#   saved_models/feature_columns.json

# API
uvicorn api.main:app --reload
```

## Repo layout

| Path | Role |
|------|------|
| `model/risk_engine.py` | GINA + App cold-start rules |
| `model/inference.py` | Elena ML + GINA routing |
| `model/feature_engineering.py` | Shared data preparation helpers |
| `model/model.py` | XGBoost model helpers |
| `model/train.py` | Population and personalized training routines |
| `model/inference_new.py` | Notebook-friendly inference helpers |
| `api/` | FastAPI `/predict` + Claude advice |
| `model/data/` | AAMOS raw CSVs (local, gitignored) |
| `docs/ELENA_HANDOFF.md` | What Elena exports for deploy |
| `notebooks/Asthma_Prediction_Model.ipynb` | Research notebook rebuilt to use the shared modules |
| `../Asthma_binary.ipynb` | Elena's binary + Edge notebook (Elena branch) |

## Cold start

New users without full AAMOS feature history get **App GINA** (`prediction_mode: gina_app`) until Elena's encoded feature pipeline is wired per user.
