"""Personalized feature engineering shared by training and inference."""

from __future__ import annotations

import pandas as pd

from model.feature_contract import BASELINE_SOURCE_COLUMNS, GROUP_COL


def engineer_personalized_features(
    df: pd.DataFrame,
    *,
    sleep_col: str = "sleep_hours",
    steps_col: str = "steps",
) -> pd.DataFrame:
    """Convert absolute sleep/steps into per-user deviation and ratio features."""
    df = df.copy()
    user_baselines = df.groupby(GROUP_COL)[[sleep_col, steps_col]].transform("mean")
    df["sleep_deviation"] = df[sleep_col] - user_baselines[sleep_col]
    df["steps_ratio"] = df[steps_col] / (user_baselines[steps_col] + 1e-5)
    return df


def compute_normalized_from_baselines(
    sleep_hours: float,
    steps: float,
    baseline_sleep_hours: float | None,
    baseline_steps: float | None,
) -> tuple[float, float, bool]:
    """
    Return sleep_deviation, steps_ratio, and cold_start flag for API inference.

    When baselines are missing, use neutral values (no deviation from self).
    """
    if baseline_sleep_hours is None or baseline_steps is None:
        return 0.0, 1.0, True
    sleep_deviation = sleep_hours - baseline_sleep_hours
    steps_ratio = steps / (baseline_steps + 1e-5)
    return sleep_deviation, steps_ratio, False
