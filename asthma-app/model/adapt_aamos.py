"""
Build Elena's AAMOS daily merge from raw CSVs and map to App feature schema.

Replicates Asthma_Prediction_Model.ipynb merge steps where local raw files exist:
dailyquestionnaire + environment + patient_info (severity).

Smartwatch sleep/steps are not in local raw/ — imputed with neutral defaults.
Label: personalized tomorrow_flare (symptom_score vs user median + delta).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import GroupKFold
from xgboost import XGBClassifier

from model.feature_contract import FEATURES, GROUP_COL, TARGET
from model.features import engineer_personalized_features

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
DEFAULT_MERGED_PATH = Path(__file__).resolve().parent.parent / "data" / "aamos_merged_daily.csv"
PERSONALIZED_FLARE_DELTA = 2

_POLLEN_MAP = {"Low": 0, "Moderate": 1, "High": 2}


def _read_bool(series: pd.Series) -> pd.Series:
    if series.dtype == bool:
        return series.fillna(False)
    return series.fillna(False).astype(str).str.upper().eq("TRUE")


def _read_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(0)


def _encode_pollen_level(row: pd.Series) -> int:
    levels = []
    for col in ("grass_pollen", "tree_pollen", "weed_pollen"):
        if col in row.index:
            val = row[col]
            if pd.isna(val):
                continue
            levels.append(_POLLEN_MAP.get(str(val), 0))
    return max(levels) if levels else 0


def _severity_to_sensitivity(severity: pd.Series) -> pd.Series:
    numeric = pd.to_numeric(severity, errors="coerce").fillna(severity.map({"Mild": 1, "Moderate": 2, "Severe": 3}))
    if numeric.dtype == object:
        numeric = severity.map({"Mild": 1, "Moderate": 2, "Severe": 3}).fillna(2)
    numeric = pd.to_numeric(numeric, errors="coerce").fillna(2)
    smin, smax = numeric.min(), numeric.max()
    if smax <= smin:
        return pd.Series(0.6, index=severity.index)
    return 0.2 + 0.4 * (numeric - smin) / (smax - smin)


def merge_aamos_from_raw(raw_dir: Path = RAW_DIR) -> pd.DataFrame:
    """Replicate Elena's daily + environment + severity merge from local AAMOS raw CSVs."""
    daily_path = raw_dir / "anonym_aamos00_dailyquestionnaire.csv"
    env_path = raw_dir / "anonym_aamos00_environment.csv"
    patient_path = raw_dir / "anonym_aamos00_patient_info.csv"

    for p in (daily_path, env_path, patient_path):
        if not p.exists():
            raise FileNotFoundError(f"Missing AAMOS raw file: {p}")

    daily = pd.read_csv(daily_path)
    env = pd.read_csv(env_path)
    patients = pd.read_csv(patient_path)

    daily["daily_limit_activity"] = _read_bool(daily["daily_limit_activity"])
    daily["daily_night_symp"] = _read_bool(daily["daily_night_symp"])
    daily["daily_day_symp"] = _read_bool(daily["daily_day_symp"])
    daily["daily_prev_inhaler"] = _read_numeric(daily["daily_prev_inhaler"])
    daily["daily_relief_inhaler"] = _read_numeric(daily["daily_relief_inhaler"])

    daily["symptom_score"] = (
        daily["daily_night_symp"].astype(int)
        + daily["daily_day_symp"].astype(int)
        + daily["daily_limit_activity"].astype(int)
        + daily["daily_prev_inhaler"]
        + daily["daily_relief_inhaler"]
    ).astype(int)

    merged = daily.merge(env, on=["user_key", "date"], how="inner")
    merged = merged.merge(
        patients[["user_key", "severity"]],
        on="user_key",
        how="left",
    )

    merged["temp_change"] = merged.groupby(GROUP_COL)["temperature"].diff().fillna(0.0)
    merged["pollen_level"] = merged.apply(_encode_pollen_level, axis=1)

    # No local smartwatch CSVs — neutral placeholders (documented limitation)
    merged["sleep_hours"] = 7.0
    merged["steps"] = 5000.0

    return merged.sort_values([GROUP_COL, "date"]).reset_index(drop=True)


def compute_personalized_flare(daily: pd.DataFrame, delta: int = PERSONALIZED_FLARE_DELTA) -> pd.Series:
    """Label: 1 if next-day symptom_score exceeds user median baseline by delta."""
    baseline = daily.groupby(GROUP_COL)["symptom_score"].transform("median")
    tomorrow_score = daily.groupby(GROUP_COL)["symptom_score"].shift(-1)
    return (tomorrow_score >= baseline + delta).fillna(0).astype(int)


def adapt_merged_to_app_schema(merged: pd.DataFrame) -> pd.DataFrame:
    """Map merged AAMOS daily frame to App FEATURES + personalized tomorrow_flare."""
    df = merged.copy()
    df["sens_cold"] = _severity_to_sensitivity(df["severity"])
    df["sens_pollen"] = df["sens_cold"] * 0.9
    df["sens_dust"] = df["sens_cold"] * 0.85
    df["cough_today"] = (
        df["daily_night_symp"].astype(int) | df["daily_day_symp"].astype(int)
    ).astype(int)
    df["inhaler_today"] = df["daily_relief_inhaler"].clip(0, 3).astype(int)
    df[TARGET] = compute_personalized_flare(df)
    return df


def load_and_adapt(path: Path | None = None) -> pd.DataFrame:
    """
    Load Elena's exported CSV or build merge from raw AAMOS files.

    Returns rows with FEATURES + TARGET after personalized feature engineering.
    """
    csv_path = path or DEFAULT_MERGED_PATH
    if csv_path.exists():
        merged = pd.read_csv(csv_path)
        print(f"Loaded Elena export: {csv_path} ({len(merged)} rows)")
    else:
        print("No daily_merged.csv — building merge from data/raw/ AAMOS CSVs")
        merged = merge_aamos_from_raw()
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        merged.to_csv(csv_path, index=False)
        print(f"Wrote merged daily -> {csv_path} ({len(merged)} rows)")

    adapted = adapt_merged_to_app_schema(merged)
    return engineer_personalized_features(adapted)


def run_evaluation(path: Path | None = None) -> None:
    """Evaluate App classifier on AAMOS-derived personalized flare labels."""
    print("=" * 72)
    print("AAMOS (Elena merge) -> App Schema + Personalized Flare")
    print("=" * 72)

    df = load_and_adapt(path)
    usable = df.dropna(subset=FEATURES + [TARGET])

    print(f"\nUsable rows: {len(usable)}  Users: {usable[GROUP_COL].nunique()}")
    print(f"Personalized flare rate: {100 * usable[TARGET].mean():.1f}%")
    print("Note: sleep/steps imputed (no smartwatch raw CSVs locally).")

    X = usable[FEATURES]
    y = usable[TARGET]
    groups = usable[GROUP_COL]

    n_splits = min(5, groups.nunique())
    if n_splits < 2:
        print("Not enough users for GroupKFold.")
        return

    gkf = GroupKFold(n_splits=n_splits)
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
        mean_auc = float(np.mean(fold_aucs))
        std_auc = float(np.std(fold_aucs))
        print(f"\nOOF Mean AUC: {mean_auc:.4f} (Std: {std_auc:.4f})")
        oof_pred = (oof_probs >= 0.5).astype(int)
        print("\nClassification report (OOF):")
        print(classification_report(y, oof_pred, digits=4, zero_division=0))
    else:
        print("\nCould not compute AUC — insufficient class balance across folds.")


if __name__ == "__main__":
    run_evaluation()
