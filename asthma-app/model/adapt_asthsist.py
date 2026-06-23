"""
Map AsthsistPlus Clean_data_2.csv (AAMOS merge) onto App feature schema.

Downloads the public CSV from MeenVP/AsthsistPlus if missing, engineers proxy
labels (next-day PEF zone yellow/red), and runs GroupKFold sanity check.
"""

from __future__ import annotations

from pathlib import Path
from urllib.request import urlretrieve

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import GroupKFold
from xgboost import XGBClassifier

from model.feature_contract import FEATURES, GROUP_COL, TARGET
from model.features import engineer_personalized_features

ASTHSIST_URL = (
    "https://raw.githubusercontent.com/MeenVP/AsthsistPlus/master/ml/Clean_data_2.csv"
)
DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "asthsist_clean_data.csv"


def download_asthsist_data(dest: Path = DATA_PATH) -> Path:
    """Fetch AsthsistPlus cleaned CSV if not present locally."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        print(f"Downloading {ASTHSIST_URL} -> {dest}")
        urlretrieve(ASTHSIST_URL, dest)
    return dest


def _severity_to_sensitivity(severity: pd.Series) -> pd.Series:
    """Map AAMOS severity (1–3) to 0.2–1.0 susceptibility proxy."""
    return 0.2 + 0.4 * (severity - severity.min()) / max(severity.max() - severity.min(), 1)


def adapt_asthsist_to_app_schema(raw: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate hourly rows to patient-days and map columns to App contract.

    Proxy label: tomorrow_flare = 1 if next-day worst PEF zone is yellow (1) or red (2).
    Missing App fields (pollen, cough, sleep) are imputed with neutral defaults.
    """
    daily = (
        raw.sort_values([GROUP_COL, "date"])
        .groupby([GROUP_COL, "date"], as_index=False)
        .agg(
            severity=("severity", "first"),
            temperature=("temperature", "first"),
            humidity=("humidity", "first"),
            aqi=("aqi", "first"),
            inhaler=("inhaler", "max"),
            steps=("Sum_steps", "max"),
            pef_zone=("pef_zone", "max"),
        )
    )

    daily["sens_cold"] = _severity_to_sensitivity(daily["severity"])
    daily["sens_pollen"] = daily["sens_cold"] * 0.9
    daily["sens_dust"] = daily["sens_cold"] * 0.85
    daily["temp_change"] = daily.groupby(GROUP_COL)["temperature"].diff().fillna(0.0)
    daily["pollen_level"] = 0
    daily["cough_today"] = (daily["pef_zone"] >= 1).astype(int)
    daily["inhaler_today"] = daily["inhaler"].clip(0, 3).astype(int)
    daily["sleep_hours"] = daily.groupby(GROUP_COL)["steps"].transform(
        lambda s: 6.5 + 0.0001 * (s - s.mean())
    )

    next_zone = daily.groupby(GROUP_COL)["pef_zone"].shift(-1)
    daily[TARGET] = ((next_zone >= 1).fillna(0)).astype(int)

    return daily


def run_sanity_check(data_path: Path | None = None) -> None:
    """Load adapted Asthsist data and evaluate with patient-level GroupKFold."""
    path = data_path or download_asthsist_data()
    print("=" * 72)
    print("AsthsistPlus -> App Schema Sanity Check (proxy labels)")
    print("=" * 72)

    raw = pd.read_csv(path)
    adapted = adapt_asthsist_to_app_schema(raw)
    df = engineer_personalized_features(adapted)

    usable = df.dropna(subset=FEATURES + [TARGET])
    print(f"\nRaw rows: {len(raw)} -> daily rows: {len(adapted)} -> usable: {len(usable)}")
    print(f"Users: {usable[GROUP_COL].nunique()}")
    print(f"Proxy label rate: {100 * usable[TARGET].mean():.1f}%")
    print("\nNote: pollen/sleep are imputed; label is next-day PEF zone >= yellow.")

    X = usable[FEATURES]
    y = usable[TARGET]
    groups = usable[GROUP_COL]

    gkf = GroupKFold(n_splits=min(5, groups.nunique()))
    oof_probs = np.zeros(len(usable))
    fold_aucs: list[float] = []

    for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups=groups)):
        X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
        X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]

        if y_val.nunique() < 2:
            print(f"Fold {fold + 1} - skipped (single class in validation)")
            continue

        num_neg = (y_train == 0).sum()
        num_pos = (y_train == 1).sum()
        model = XGBClassifier(
            objective="binary:logistic",
            eval_metric="auc",
            random_state=42 + fold,
            n_estimators=100,
            max_depth=3,
            learning_rate=0.08,
            scale_pos_weight=num_neg / max(1, num_pos),
        )
        model.fit(X_train, y_train)
        probs = model.predict_proba(X_val)[:, 1]
        oof_probs[val_idx] = probs
        fold_auc = roc_auc_score(y_val, probs)
        fold_aucs.append(fold_auc)
        print(f"Fold {fold + 1} - Validation AUC: {fold_auc:.4f}")

    if fold_aucs:
        print(f"\nOOF Mean AUC: {np.mean(fold_aucs):.4f} (Std: {np.std(fold_aucs):.4f})")
        oof_pred = (oof_probs >= 0.5).astype(int)
        print("\nClassification report (OOF):")
        print(classification_report(y, oof_pred, digits=4, zero_division=0))
    else:
        print("\nCould not compute AUC — insufficient class balance across folds.")


if __name__ == "__main__":
    run_sanity_check()
