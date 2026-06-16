"""Train XGBoost flare-up model on AAMOS-00 data."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score
from xgboost import XGBClassifier

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
MODEL_DIR = Path(__file__).resolve().parent.parent / "saved_models"

PATIENT_ID_COL = "user_key"
DATE_COL = "date"

POLLEN_MAP = {"Low": 1, "Moderate": 2, "High": 3, "Very High": 4}

FEATURES = [
    "aqi_lag1",
    "aqi_lag2",
    "temp_lag1",
    "pollen_lag1",
    "pef_am",
]


def inspect_csv_files() -> dict[str, pd.DataFrame]:
    """Load every CSV in data/raw/ and print shape, columns, and first 3 rows."""
    frames: dict[str, pd.DataFrame] = {}
    csv_paths = sorted(DATA_DIR.glob("*.csv"))

    print("=" * 72)
    print("Step 1 — CSV inspection")
    print("=" * 72)

    for path in csv_paths:
        df = pd.read_csv(path)
        frames[path.name] = df
        print(f"\nFile: {path.name}")
        print(f"Shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        print("First 3 rows:")
        print(df.head(3).to_string(index=False))

    return frames


def report_dataset_structure(frames: dict[str, pd.DataFrame]) -> None:
    """Identify source files for labels, environment, peak flow, and key columns."""
    print("\n" + "=" * 72)
    print("Step 2 — Dataset structure")
    print("=" * 72)

    daily_file = "anonym_aamos00_dailyquestionnaire.csv"
    env_file = "anonym_aamos00_environment.csv"
    peakflow_file = "anonym_aamos00_peakflow.csv"

    daily_cols = set(frames[daily_file].columns)

    print(
        f"\nDaily symptoms and flare label: {daily_file}\n"
        f"  Symptom columns: "
        f"{[c for c in daily_cols if c.startswith('daily_')]}\n"
        f"  Flare label: daily_night_symp AND "
        f"(daily_relief_inhaler >= 3 OR daily_limit_activity)"
    )

    print(
        f"\nEnvironmental data: {env_file}\n"
        f"  AQI column: aqi\n"
        f"  Temperature column: temperature\n"
        f"  Pollen columns: grass_pollen, tree_pollen, weed_pollen"
    )

    print(
        f"\nPeak flow readings: {peakflow_file}\n"
        f"  Morning readings: filter morning == True, use pef_max as pef_am\n"
        f"  (There is no pef_am column; it is derived from morning peak flow.)"
    )

    print(
        f"\nPatient ID column (all files): {PATIENT_ID_COL}\n"
        f"Date column (all files): {DATE_COL} (study day offset)"
    )

    optional_files = [
        name
        for name in frames
        if name
        not in {daily_file, env_file, peakflow_file, "anonym_aamos00_patient_info.csv"}
    ]
    if optional_files:
        print(f"\nOther raw files (not merged for training): {optional_files}")


def compute_flare_label(daily: pd.DataFrame) -> pd.DataFrame:
    """Derive binary flare label from daily questionnaire symptom columns."""
    df = daily.copy()
    df["daily_limit_activity"] = df["daily_limit_activity"].map(
        {"True": True, "False": False, True: True, False: False}
    )
    df["label"] = (
        df["daily_night_symp"]
        & ((df["daily_relief_inhaler"] >= 3) | df["daily_limit_activity"])
    ).astype(int)
    return df


def encode_pollen(environment: pd.DataFrame) -> pd.DataFrame:
    """Map categorical pollen levels to numeric scores and take the daily maximum."""
    env = environment.copy()
    for column in ("grass_pollen", "tree_pollen", "weed_pollen"):
        env[f"{column}_score"] = env[column].map(POLLEN_MAP)
    env["pollen"] = env[
        ["grass_pollen_score", "tree_pollen_score", "weed_pollen_score"]
    ].max(axis=1)
    env["temp"] = env["temperature"]
    return env


def build_pef_am(peakflow: pd.DataFrame) -> pd.DataFrame:
    """Extract one morning peak-flow value (pef_am) per patient-day."""
    morning = peakflow[peakflow["morning"]].copy()
    return (
        morning.groupby([PATIENT_ID_COL, DATE_COL], as_index=False)["pef_max"]
        .max()
        .rename(columns={"pef_max": "pef_am"})
    )


def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create lag features per patient, sorted by date."""
    df = df.sort_values([PATIENT_ID_COL, DATE_COL]).copy()

    lag_spec = {"aqi": [1, 2], "temp": [1], "pollen": [1]}
    for column, lags in lag_spec.items():
        grouped = df.groupby(PATIENT_ID_COL)[column]
        for lag in lags:
            df[f"{column}_lag{lag}"] = grouped.shift(lag)

    return df


def build_training_dataset(frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Merge questionnaires, environment, and peak flow; engineer labels and lags."""
    print("\n" + "=" * 72)
    print("Step 3 — Build training dataset")
    print("=" * 72)

    daily = compute_flare_label(frames["anonym_aamos00_dailyquestionnaire.csv"])
    environment = encode_pollen(frames["anonym_aamos00_environment.csv"])
    peakflow = build_pef_am(frames["anonym_aamos00_peakflow.csv"])

    merged = daily.merge(
        environment[[PATIENT_ID_COL, DATE_COL, "aqi", "temp", "pollen"]],
        on=[PATIENT_ID_COL, DATE_COL],
        how="inner",
    )
    merged = merged.merge(peakflow, on=[PATIENT_ID_COL, DATE_COL], how="left")

    merged = add_lag_features(merged)
    merged = merged.dropna()

    label_counts = merged["label"].value_counts().sort_index()
    print(f"\nFinal dataset shape: {merged.shape}")
    print("Class balance:")
    print(f"  label=0 (no flare): {label_counts.get(0, 0)}")
    print(f"  label=1 (flare): {label_counts.get(1, 0)}")

    return merged


def time_based_split(df: pd.DataFrame, train_fraction: float = 0.8):
    """Split by calendar order: earliest dates train, latest dates test."""
    unique_dates = sorted(df[DATE_COL].unique())
    split_index = int(len(unique_dates) * train_fraction)
    train_dates = set(unique_dates[:split_index])

    train_df = df[df[DATE_COL].isin(train_dates)].copy()
    test_df = df[~df[DATE_COL].isin(train_dates)].copy()
    return train_df, test_df


def train_model(df: pd.DataFrame) -> XGBClassifier:
    """Train XGBClassifier with a time-based holdout split."""
    print("\n" + "=" * 72)
    print("Step 4 — Train XGBoost model")
    print("=" * 72)

    features = [f for f in FEATURES if f in df.columns]
    print(f"\nFeatures used: {features}")

    train_df, test_df = time_based_split(df)
    print(
        f"Time split on {DATE_COL}: "
        f"train={train_df.shape[0]} rows, test={test_df.shape[0]} rows"
    )

    X_train = train_df[features]
    y_train = train_df["label"]
    X_test = test_df[features]
    y_test = test_df["label"]

    model = XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        random_state=42,
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.9,
        colsample_bytree=0.9,
    )
    model.fit(X_train, y_train)

    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)

    if y_test.nunique() > 1:
        auc = roc_auc_score(y_test, y_prob)
        print(f"\nTest AUC: {auc:.4f}")
    else:
        print(
            "\nTest AUC: undefined (test set contains only one class "
            f"— {y_test.iloc[0]})"
        )

    print("\nClassification report:")
    print(classification_report(y_test, y_pred, digits=4, zero_division=0))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / "asthma_model.pkl"
    joblib.dump({"model": model, "features": features}, model_path)
    print(f"\nSaved model to {model_path}")

    return model


def main() -> None:
    frames = inspect_csv_files()
    report_dataset_structure(frames)
    dataset = build_training_dataset(frames)
    train_model(dataset)


if __name__ == "__main__":
    main()
