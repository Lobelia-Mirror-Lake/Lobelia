"""Forecast and advice API tests."""

from __future__ import annotations

from datetime import date
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.models import CheckIn, User


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
    assert "data_quality" in body
    assert "calendar" in body["data_quality"]["unavailable_context"]


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
    assert "check_in" not in advice.json()["data_quality"]["unavailable_context"]


@patch("services.forecast_service.generate_advice")
@patch("services.forecast_service.fetch_env_daily")
def test_advice_without_check_in_still_returns_advice(
    mock_fetch_env,
    mock_generate_advice,
    client: TestClient,
    auth_headers: dict,
    db_session: Session,
    mock_env_fetch,
    mock_advice,
):
    """Advice may run from cached forecast + environment even if today's check-in is gone."""
    mock_fetch_env.side_effect = mock_env_fetch.side_effect
    mock_generate_advice.side_effect = mock_advice.side_effect

    client.post(
        "/v1/check-ins",
        json={"calendar_event": "Outdoor walk"},
        headers=auth_headers,
    )
    forecast = client.post(
        "/v1/forecast",
        json={"lat": 42.36, "lon": -71.06},
        headers=auth_headers,
    )
    assert forecast.status_code == 200, forecast.text

    user = db_session.scalar(select(User).where(User.email == "testuser@example.com"))
    assert user is not None
    check_in = db_session.scalar(
        select(CheckIn).where(CheckIn.user_id == user.id, CheckIn.date == date.today())
    )
    assert check_in is not None
    db_session.delete(check_in)
    db_session.commit()

    mock_generate_advice.reset_mock()
    mock_generate_advice.side_effect = mock_advice.side_effect

    advice = client.post("/v1/advice", json={}, headers=auth_headers)
    assert advice.status_code == 200, advice.text
    body = advice.json()
    assert body["advice"]["summary"] == "Test advice summary."
    assert "check_in" in body["data_quality"]["unavailable_context"]
    assert any("without today's symptom check-in" in w for w in body["warnings"])

    kwargs = mock_generate_advice.call_args.kwargs
    assert "unknown" in kwargs["symptoms_summary"].lower()
    assert kwargs["calendar_event"] is None


def test_advice_without_forecast_returns_404(client: TestClient, auth_headers: dict):
    response = client.post("/v1/advice", json={}, headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["code"] == "FORECAST_NOT_FOUND"


@patch("services.forecast_service.generate_advice")
@patch("services.forecast_service.fetch_env_daily")
def test_forecast_survives_llm_outage(
    mock_fetch_env,
    mock_generate_advice,
    client: TestClient,
    auth_headers: dict,
    mock_env_fetch,
):
    mock_fetch_env.side_effect = mock_env_fetch.side_effect
    mock_generate_advice.side_effect = RuntimeError("provider outage")
    assert client.post("/v1/check-ins", json={}, headers=auth_headers).status_code == 201

    response = client.post(
        "/v1/forecast",
        json={"lat": 42.36, "lon": -71.06},
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["advice"] is None
    assert any("forecast is still valid" in warning for warning in response.json()["warnings"])


@patch("services.forecast_service.generate_advice")
@patch("services.forecast_service.fetch_env_daily")
def test_forecast_passes_manual_calendar_event(
    mock_fetch_env,
    mock_generate_advice,
    client: TestClient,
    auth_headers: dict,
    mock_env_fetch,
    mock_advice,
):
    mock_fetch_env.side_effect = mock_env_fetch.side_effect
    mock_generate_advice.side_effect = mock_advice.side_effect

    client.post(
        "/v1/check-ins",
        json={"calendar_event": "Outdoor soccer tomorrow"},
        headers=auth_headers,
    )
    response = client.post(
        "/v1/forecast",
        json={"lat": 42.36, "lon": -71.06},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    kwargs = mock_generate_advice.call_args.kwargs
    assert kwargs["calendar_event"] == "Outdoor soccer tomorrow"
    assert "calendar" not in response.json()["data_quality"]["unavailable_context"]
