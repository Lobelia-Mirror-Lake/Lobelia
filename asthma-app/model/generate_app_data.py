"""Generate multi-user synthetic app data with personalized susceptibility profiles."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "app_real_fake_data.csv"
NUM_USERS = 500
DAYS_PER_USER = 40
RANDOM_SEED = 42


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def generate_app_data(
    num_users: int = NUM_USERS,
    days_per_user: int = DAYS_PER_USER,
    seed: int = RANDOM_SEED,
) -> pd.DataFrame:
    """
    Simulate grouped patient-days where flare risk depends on static susceptibility
    profiles interacting with dynamic environment and symptom signals — not one
    global rule applied identically to every user.
    """
    rng = np.random.default_rng(seed)
    rows: list[dict] = []

    for user_id in range(num_users):
        user_key = f"user_{user_id:04d}"

        # Static susceptibility phenotype (stable per user, known to the app onboarding)
        sens_cold = float(rng.uniform(0.2, 1.0))
        sens_pollen = float(rng.uniform(0.2, 1.0))
        sens_dust = float(rng.uniform(0.2, 1.0))
        baseline_sleep = float(rng.uniform(5.0, 8.5))
        baseline_steps = float(rng.uniform(2000, 12000))

        # Unobserved user heterogeneity — affects labels only, not exported as a feature
        user_latent_risk = float(rng.normal(0.0, 0.35))

        for _ in range(days_per_user):
            temp_change = float(rng.uniform(-10, 10))
            aqi = float(rng.uniform(10, 300))
            humidity = float(rng.uniform(20, 90))
            pollen_level = int(rng.choice([0, 1, 2], p=[0.6, 0.3, 0.1]))
            sleep_hours = float(np.clip(baseline_sleep + rng.normal(0, 0.7), 4.0, 9.5))
            steps = float(
                np.clip(baseline_steps * rng.lognormal(mean=0.0, sigma=0.25), 500, 18000)
            )
            cough_today = int(rng.choice([0, 1], p=[0.82, 0.18]))
            inhaler_today = int(rng.choice([0, 1, 2, 3], p=[0.72, 0.18, 0.07, 0.03]))

            sleep_deviation = sleep_hours - baseline_sleep
            steps_ratio = steps / (baseline_steps + 1e-5)

            # Personalized log-odds: static sensitivity modulates dynamic exposures
            logit = -2.2 + user_latent_risk
            logit += sens_cold * max(0.0, -temp_change - 2.0) * 0.18
            logit += sens_pollen * pollen_level * 0.45
            logit += sens_dust * (aqi / 150.0) * 0.35
            logit += max(0.0, -sleep_deviation - 0.5) * 0.55
            logit += max(0.0, 1.0 - steps_ratio) * 0.25
            logit += cough_today * 0.65
            logit += inhaler_today * 0.40
            logit += float(rng.normal(0.0, 0.45))

            flare_prob = _sigmoid(logit)
            tomorrow_flare = int(rng.random() < flare_prob)

            rows.append(
                {
                    "user_key": user_key,
                    "sens_cold": sens_cold,
                    "sens_pollen": sens_pollen,
                    "sens_dust": sens_dust,
                    "temp_change": temp_change,
                    "aqi": aqi,
                    "humidity": humidity,
                    "pollen_level": pollen_level,
                    "sleep_hours": sleep_hours,
                    "steps": steps,
                    "cough_today": cough_today,
                    "inhaler_today": inhaler_today,
                    "tomorrow_flare": tomorrow_flare,
                }
            )

    return pd.DataFrame(rows)


def main() -> None:
    df = generate_app_data()
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATA_PATH, index=False)

    flare_rate = 100 * df["tomorrow_flare"].mean()
    print(f"Generated {len(df)} rows across {df['user_key'].nunique()} users -> {DATA_PATH}")
    print(f"Tomorrow flare rate: {flare_rate:.1f}%")
    print(f"Static susceptibility ranges:")
    for col in ("sens_cold", "sens_pollen", "sens_dust"):
        print(f"  {col}: {df[col].min():.2f} – {df[col].max():.2f}")


if __name__ == "__main__":
    main()
