"""GET /v1/forecasts history tests."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient


@patch("services.forecast_service.generate_advice")
@patch("services.forecast_service.fetch_env_daily")
def test_list_and_get_today_forecast(
    mock_fetch_env,
    mock_generate_advice,
    client: TestClient,
    auth_headers: dict,
    mock_env_fetch,
    mock_advice,
):
    mock_fetch_env.side_effect = mock_env_fetch.side_effect
    mock_generate_advice.side_effect = mock_advice.side_effect

    client.post("/v1/check-ins/inhaler/puff", headers=auth_headers)
    create = client.post(
        "/v1/forecast",
        json={"lat": 42.36, "lon": -71.06},
        headers=auth_headers,
    )
    assert create.status_code == 200, create.text

    today = client.get("/v1/forecasts/today", headers=auth_headers)
    assert today.status_code == 200, today.text
    assert today.json()["risk_level"] in ("Low", "Medium", "High")

    history = client.get("/v1/forecasts", headers=auth_headers)
    assert history.status_code == 200
    assert len(history.json()["items"]) >= 1


def test_forecasts_today_without_run_returns_404(client: TestClient, auth_headers: dict):
    response = client.get("/v1/forecasts/today", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["code"] == "FORECAST_NOT_FOUND"
