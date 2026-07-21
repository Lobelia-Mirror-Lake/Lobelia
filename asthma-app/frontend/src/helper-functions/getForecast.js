// src/helper-functions/getForecast.js

export async function getForecast({ lat, lon, token, date }) {
  const response = await fetch("http://localhost:8000/v1/forecast", {
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

  const data = await response.json();

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