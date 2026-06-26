# Asthma Flare-up Prediction App

Predict **tomorrow's asthma flare-up** using **Elena's AAMOS-trained classifier**, served via FastAPI with GINA cold-start fallback for new users.

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
| `api/` | FastAPI `/predict` + Claude advice |
| `data/raw/` | AAMOS raw CSVs (local, gitignored) |
| `docs/ELENA_HANDOFF.md` | What Elena exports for deploy |
| `../Asthma_Prediction_Model.ipynb` | Elena's research notebook (regression, on main) |
| `../Asthma_binary.ipynb` | Elena's binary + Edge notebook (Elena branch) |

## Cold start

New users without full AAMOS feature history get **App GINA** (`prediction_mode: gina_app`) until Elena's encoded feature pipeline is wired per user.
