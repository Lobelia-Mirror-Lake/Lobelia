"""Train XGBoost on app-realistic synthetic data with GroupKFold."""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import GroupKFold
from xgboost import XGBClassifier

from model.feature_contract import (
    ENVIRONMENT_FEATURES,
    FEATURES,
    GROUP_COL,
    NORMALIZED_FEATURES,
    STATIC_FEATURES,
    SYMPTOM_FEATURES,
    TARGET,
)
from model.features import engineer_personalized_features

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "app_real_fake_data.csv"
MODEL_PATH = Path(__file__).resolve().parent.parent / "saved_models" / "my_app_asthma_model.pkl"


def train_and_evaluate() -> None:
    """Run patient-level GroupKFold CV and train the final export model."""
    print("=" * 72)
    print("Starting Patient-Level Personalized Model Pipeline")
    print("=" * 72)

    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Data file not found at {DATA_PATH}. Run model/generate_app_data.py first."
        )

    raw_df = pd.read_csv(DATA_PATH)
    df = engineer_personalized_features(raw_df)

    X = df[FEATURES]
    y = df[TARGET]
    groups = df[GROUP_COL]

    print(f"\nDataset shape: {df.shape}")
    print(f"Users: {df[GROUP_COL].nunique()}")
    print(f"Features: {FEATURES}")
    print(f"\nTarget distribution:\n{y.value_counts(normalize=True).to_string()}")

    gkf = GroupKFold(n_splits=5)
    oof_predictions = np.zeros(len(df))
    fold_aucs: list[float] = []

    for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups=groups)):
        X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
        X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]

        num_neg = (y_train == 0).sum()
        num_pos = (y_train == 1).sum()
        scale_pos_weight = num_neg / max(1, num_pos)

        fold_model = XGBClassifier(
            objective="binary:logistic",
            eval_metric="auc",
            random_state=42 + fold,
            n_estimators=100,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
        )
        fold_model.fit(X_train, y_train)

        probs = fold_model.predict_proba(X_val)[:, 1]
        oof_predictions[val_idx] = fold_model.predict(X_val)

        fold_auc = roc_auc_score(y_val, probs)
        fold_aucs.append(fold_auc)
        print(f"Fold {fold + 1} - Validation AUC: {fold_auc:.4f}")

    print("\n" + "-" * 40)
    print(f"OOF Mean AUC-ROC: {np.mean(fold_aucs):.4f} (Std: {np.std(fold_aucs):.4f})")
    print("-" * 40)

    print("\nOverall Out-of-Fold Classification Report:")
    print(classification_report(y, oof_predictions, digits=4))

    final_neg = (y == 0).sum()
    final_pos = (y == 1).sum()
    final_scale_weight = final_neg / max(1, final_pos)

    final_model = XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        random_state=42,
        n_estimators=100,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=final_scale_weight,
    )
    final_model.fit(X, y)

    print("\nFeature importances (final model):")
    for col, val in sorted(
        zip(FEATURES, final_model.feature_importances_), key=lambda item: item[1], reverse=True
    ):
        print(f"  {col:18}: {val:.4f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": final_model,
            "features": FEATURES,
            "static_features": STATIC_FEATURES,
            "environment_features": ENVIRONMENT_FEATURES,
            "symptom_features": SYMPTOM_FEATURES,
            "normalized_features": NORMALIZED_FEATURES,
            "baseline_source_columns": {"sleep": "sleep_hours", "steps": "steps"},
            "group_col": GROUP_COL,
        },
        MODEL_PATH,
    )
    print(f"\nSuccessfully saved personalized model to {MODEL_PATH}")


if __name__ == "__main__":
    train_and_evaluate()
