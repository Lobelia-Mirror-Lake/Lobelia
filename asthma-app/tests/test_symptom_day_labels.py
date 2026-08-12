"""Symptom day labels must match the viewer's local calendar, not the check-in day as 'today'."""

from __future__ import annotations

from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from services.forecast_service import (
    _humanize_top_features,
    _relabel_symptom_factors,
    _symptom_day_phrase,
)


def test_symptom_day_phrase_today_yesterday_and_older():
    today = date(2026, 8, 12)
    assert _symptom_day_phrase(today, reference=today) == "today"
    assert _symptom_day_phrase(today - timedelta(days=1), reference=today) == "yesterday"
    assert _symptom_day_phrase(date(2026, 8, 10), reference=today) == "on 2026-08-10"


def test_humanize_labels_yesterday_check_in_for_todays_prediction():
    """Before 6pm Home shows today's risk from yesterday's check-in."""
    today = date(2026, 8, 12)
    yesterday = today - timedelta(days=1)
    check_in = SimpleNamespace(
        date=yesterday,
        daily_night_symp=True,
        daily_day_symp=True,
        puffs_today=0,
    )
    factors = _humanize_top_features([], {}, check_in, reference_date=today)
    assert "Night symptoms yesterday" in factors
    assert "Daytime symptoms yesterday" in factors
    assert "Night symptoms today" not in factors


def test_humanize_labels_today_check_in_for_tomorrows_prediction():
    """After 6pm Home prefers tomorrow's risk from today's check-in."""
    today = date(2026, 8, 12)
    check_in = SimpleNamespace(
        date=today,
        daily_night_symp=True,
        daily_day_symp=False,
        puffs_today=2,
    )
    factors = _humanize_top_features([], {}, check_in, reference_date=today)
    assert "Night symptoms today" in factors
    assert "Rescue inhaler used 2 times today" in factors
    assert "Night symptoms yesterday" not in factors


def test_relabel_rewrites_stale_today_on_stored_forecast():
    today = date(2026, 8, 12)
    yesterday = today - timedelta(days=1)
    relabeled = _relabel_symptom_factors(
        ["Night symptoms today", "Daytime symptoms today", "High humidity"],
        check_in_day=yesterday,
        reference_date=today,
    )
    assert relabeled == [
        "Night symptoms yesterday",
        "Daytime symptoms yesterday",
        "High humidity",
    ]


@patch("services.forecast_service.generate_advice")
@patch("services.forecast_service.fetch_env_daily")
def test_api_todays_card_from_yesterday_check_in_says_yesterday(
    mock_fetch_env,
    mock_generate_advice,
    client: TestClient,
    auth_headers: dict,
    mock_env_fetch,
    mock_advice,
):
    mock_fetch_env.side_effect = mock_env_fetch.side_effect
    mock_generate_advice.side_effect = mock_advice.side_effect

    today = date.today()
    yesterday = today - timedelta(days=1)

    assert (
        client.post(
            "/v1/check-ins",
            json={
                "date": yesterday.isoformat(),
                "daily_day_symp": True,
                "daily_night_symp": True,
            },
            headers=auth_headers,
        ).status_code
        == 201
    )
    create = client.post(
        "/v1/forecast",
        json={"lat": 42.36, "lon": -71.06, "date": yesterday.isoformat()},
        headers=auth_headers,
    )
    assert create.status_code == 200, create.text
    factors = create.json()["contributing_factors"]
    assert "Night symptoms yesterday" in factors
    assert "Daytime symptoms yesterday" in factors

    cards = client.get("/v1/forecasts/today", headers=auth_headers)
    assert cards.status_code == 200
    today_card = cards.json()["today"]
    assert today_card is not None
    assert "Night symptoms yesterday" in today_card["contributing_factors"]
    assert "Night symptoms today" not in today_card["contributing_factors"]


@patch("services.forecast_service.generate_advice")
@patch("services.forecast_service.fetch_env_daily")
def test_api_tomorrows_card_from_today_check_in_says_today(
    mock_fetch_env,
    mock_generate_advice,
    client: TestClient,
    auth_headers: dict,
    mock_env_fetch,
    mock_advice,
):
    mock_fetch_env.side_effect = mock_env_fetch.side_effect
    mock_generate_advice.side_effect = mock_advice.side_effect

    today = date.today()

    assert (
        client.post(
            "/v1/check-ins",
            json={
                "date": today.isoformat(),
                "daily_night_symp": True,
                "daily_day_symp": False,
            },
            headers=auth_headers,
        ).status_code
        == 201
    )
    create = client.post(
        "/v1/forecast",
        json={"lat": 42.36, "lon": -71.06, "date": today.isoformat()},
        headers=auth_headers,
    )
    assert create.status_code == 200, create.text
    factors = create.json()["contributing_factors"]
    assert "Night symptoms today" in factors
    assert "Night symptoms yesterday" not in factors

    cards = client.get("/v1/forecasts/today", headers=auth_headers)
    assert cards.status_code == 200
    tomorrow_card = cards.json()["tomorrow"]
    assert tomorrow_card is not None
    assert "Night symptoms today" in tomorrow_card["contributing_factors"]


@patch("services.forecast_service.generate_advice")
@patch("services.forecast_service.fetch_env_daily")
@patch("services.forecast_service.local_after_six_pm", return_value=False)
def test_ensure_cards_before_six_keeps_today_card_with_yesterday_labels(
    _mock_after_six,
    mock_fetch_env,
    mock_generate_advice,
    client: TestClient,
    auth_headers: dict,
    mock_env_fetch,
    mock_advice,
):
    """Before 6pm: POST /forecasts/today should surface today's card, not generate tomorrow."""
    mock_fetch_env.side_effect = mock_env_fetch.side_effect
    mock_generate_advice.side_effect = mock_advice.side_effect

    today = date.today()
    yesterday = today - timedelta(days=1)

    assert (
        client.post(
            "/v1/check-ins",
            json={
                "date": yesterday.isoformat(),
                "daily_night_symp": True,
            },
            headers=auth_headers,
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/v1/check-ins",
            json={
                "date": today.isoformat(),
                "daily_day_symp": True,
            },
            headers=auth_headers,
        ).status_code
        == 201
    )

    response = client.post(
        "/v1/forecasts/today",
        json={"lat": 42.36, "lon": -71.06, "timezone": "America/Chicago"},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["today"] is not None
    assert "Night symptoms yesterday" in body["today"]["contributing_factors"]
    # Before 6pm tomorrow must not be newly generated from today's check-in.
    assert body["tomorrow"] is None


@patch("services.forecast_service.generate_advice")
@patch("services.forecast_service.fetch_env_daily")
@patch("services.forecast_service.local_after_six_pm", return_value=True)
def test_ensure_cards_after_six_includes_tomorrow_with_today_labels(
    _mock_after_six,
    mock_fetch_env,
    mock_generate_advice,
    client: TestClient,
    auth_headers: dict,
    mock_env_fetch,
    mock_advice,
):
    """After 6pm: both cards can exist; tomorrow's factors come from today's check-in."""
    mock_fetch_env.side_effect = mock_env_fetch.side_effect
    mock_generate_advice.side_effect = mock_advice.side_effect

    today = date.today()
    yesterday = today - timedelta(days=1)

    assert (
        client.post(
            "/v1/check-ins",
            json={
                "date": yesterday.isoformat(),
                "daily_night_symp": True,
            },
            headers=auth_headers,
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/v1/check-ins",
            json={
                "date": today.isoformat(),
                "daily_day_symp": True,
            },
            headers=auth_headers,
        ).status_code
        == 201
    )

    response = client.post(
        "/v1/forecasts/today",
        json={"lat": 42.36, "lon": -71.06, "timezone": "America/Chicago"},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["today"] is not None
    assert "Night symptoms yesterday" in body["today"]["contributing_factors"]
    assert body["tomorrow"] is not None
    assert "Daytime symptoms today" in body["tomorrow"]["contributing_factors"]
    assert "Daytime symptoms yesterday" not in body["tomorrow"]["contributing_factors"]
