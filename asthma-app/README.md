# Asthma Flare-up Prediction App

Predict **tomorrow's asthma flare-up probability** from App-realistic signals:
environment (auto), wearables (passive), and a one-tap daily check-in.

## Quick start

```bash
cd asthma-app
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Synthetic pipeline
python -m model.generate_app_data
python -m model.train_my_app_model

# Real-structure sanity check (AsthsistPlus CSV)
python -m model.adapt_asthsist

# AAMOS merge (Elena logic from raw CSVs, or her export when available)
python -m model.adapt_aamos

# API
uvicorn api.main:app --reload
```

See [`model/feature_contract.md`](model/feature_contract.md) for the feature schema and
[`docs/PROFESSOR_BRIEF.md`](docs/PROFESSOR_BRIEF.md) for methodology and expected metrics.
[`docs/RESULTS.md`](docs/RESULTS.md) has latest evaluation numbers and API curl examples.

Legacy AAMOS pipeline: `model/train.py` (superseded by `model/train_my_app_model.py`).
