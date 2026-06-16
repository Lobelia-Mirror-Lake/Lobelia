import pandas as pd


def build_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lag-1 and lag-2 columns for aqi, temp, and pollen, grouped by user_key."""
    df = df.copy()
    lag_columns = ["aqi", "temp", "pollen"]

    for column in lag_columns:
        if column not in df.columns:
            continue
        grouped = df.groupby("user_key")[column]
        df[f"{column}_lag1"] = grouped.shift(1)
        df[f"{column}_lag2"] = grouped.shift(2)

    return df
