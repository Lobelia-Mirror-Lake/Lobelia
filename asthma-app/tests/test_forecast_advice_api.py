"""Forecast and advice API tests."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient


def test_forecast_requires_check_in_or_puff(client: TestClient, auth_headers: dict):
    response = client.post(
        "/v1/forecast",
        json={"lat": 42.36, "lon": -71.06},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert response.json()["code"] == "CHECK_IN_REQUIRED"


@patch("services.forecast_service.generate_advice")
@patch("services.forecast_service.fetch_env_daily")
def test_forecast_with_puff_only(
    mock_fetch_env,
    mock_generate_advice,
    client: TestClient,
    auth_headers: dict,
    mock_env_fetch,
    mock_advice,
):
    mock_fetch_env.side_effect = mock_env_fetch.side_effect
    mock_generate_advice.side_effect = mock_advice.side_effect

    assert client.post("/v1/check-ins/inhaler/puff", headers=auth_headers).status_code == 200

    response = client.post(
        "/v1/forecast",
        json={"lat": 42.36, "lon": -71.06},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["prediction_mode"] == "classifier"
    assert "flare_probability" in body
    assert body["advice"]["summary"] == "Test advice summary."


@patch("services.forecast_service.generate_advice")
@patch("services.forecast_service.fetch_env_daily")
def test_advice_regeneration(
    mock_fetch_env,
    mock_generate_advice,
    client: TestClient,
    auth_headers: dict,
    mock_env_fetch,
    mock_advice,
):
    mock_fetch_env.side_effect = mock_env_fetch.side_effect
    mock_generate_advice.side_effect = mock_advice.side_effect

    client.post("/v1/check-ins", json={}, headers=auth_headers)
    client.post("/v1/forecast", json={"lat": 42.36, "lon": -71.06}, headers=auth_headers)

    mock_generate_advice.reset_mock()
    mock_generate_advice.side_effect = mock_advice.side_effect

    advice = client.post("/v1/advice", json={"llm_provider": "gemini"}, headers=auth_headers)
    assert advice.status_code == 200, advice.text
    assert advice.json()["advice"]["summary"] == "Test advice summary."
    assert mock_generate_advice.called


def test_advice_without_forecast_returns_404(client: TestClient, auth_headers: dict):
    response = client.post("/v1/advice", json={}, headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["code"] == "FORECAST_NOT_FOUND"
