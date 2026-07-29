import { API_URL } from "../config";
import {
  isAfterSixPm,
  localYmd,
  selectCardPredictions,
  selectHomeForecast,
  yesterdayYmd,
} from "./forecastDisplayLogic";

export async function getForecast({ lat, lon, token, date }) {
  const response = await fetch(`${API_URL}/v1/forecast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      lat,
      lon,
      ...(date ? { date } : {}),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail?.message || "Failed to load forecast";

    const error = new Error(message);
    error.code = data?.detail?.code || data?.code;
    error.status = response.status;
    throw error;
  }

  return data;
}

/** Read stored today/tomorrow predictions (no ML/LLM). */
export async function getStoredPredictions({ token }) {
  const response = await fetch(`${API_URL}/v1/forecasts/today`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail?.message || "No prediction for today yet."
    );
    error.code = data?.detail?.code || data?.code;
    error.status = response.status;
    throw error;
  }
  return {
    today: data.today || null,
    tomorrow: data.tomorrow || null,
  };
}

/**
 * Shared Home + Statistics loader.
 * Reads stored predictions first; generates (and stores) only when missing.
 * Applies the 6pm rule so tomorrow is not shown before 18:00.
 */
export async function loadCardPredictions({ token, lat, lon, now = new Date() }) {
  let today = null;
  let tomorrow = null;

  try {
    const stored = await getStoredPredictions({ token });
    today = stored.today;
    tomorrow = stored.tomorrow;
  } catch (error) {
    if (error.code !== "FORECAST_NOT_FOUND" && error.status !== 404) {
      throw error;
    }
  }

  if (!today) {
    try {
      today = await getForecast({
        lat,
        lon,
        token,
        date: yesterdayYmd(now),
      });
    } catch {
      today = null;
    }
  }

  if (isAfterSixPm(now) && !tomorrow) {
    try {
      tomorrow = await getForecast({
        lat,
        lon,
        token,
        date: localYmd(now),
      });
    } catch {
      tomorrow = null;
    }
  }

  const visible = selectCardPredictions({ today, tomorrow }, now);

  if (!visible.today && !visible.tomorrow) {
    const error = new Error(
      "Complete a symptom check-in to generate your risk prediction."
    );
    error.code = "CHECK_IN_REQUIRED";
    throw error;
  }

  return visible;
}

/** Home card: today's risk before 6pm; after 6pm prefer tomorrow if available. */
export async function loadDisplayForecast({ token, lat, lon, now = new Date() }) {
  const cards = await loadCardPredictions({ token, lat, lon, now });
  return selectHomeForecast(cards, now);
}

export {
  homeRiskHeading,
  isAfterSixPm,
  localYmd,
  yesterdayYmd,
  selectCardPredictions,
  selectHomeForecast,
  statisticsReminderText,
} from "./forecastDisplayLogic";
