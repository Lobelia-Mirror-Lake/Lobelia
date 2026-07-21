"""Check-in and inhaler API tests."""

from datetime import date, timedelta

from fastapi.testclient import TestClient


def test_check_in_defaults_and_puff(client: TestClient, auth_headers: dict):
    create = client.post(
        "/v1/check-ins",
        json={},
        headers=auth_headers,
    )
    assert create.status_code == 201
    body = create.json()
    assert body["daily_day_symp"] is False
    assert body["daily_night_symp"] is False
    assert body["daily_limit_activity"] is False
    assert body["symptoms_logged"] is True
    assert body["puffs_today"] == 0
    assert body["symptom_burden_score"] == 0

    puff = client.post("/v1/check-ins/inhaler/puff", headers=auth_headers)
    assert puff.status_code == 200
    assert puff.json()["puffs_today"] == 1

    manual = client.put(
        "/v1/check-ins/inhaler",
        json={"puffs_today": 4},
        headers=auth_headers,
    )
    assert manual.status_code == 200
    assert manual.json()["puffs_today"] == 4
    assert manual.json()["is_flare_up_threshold"] is True


def test_today_check_in_endpoint(client: TestClient, auth_headers: dict):
    response = client.get("/v1/check-ins/today", headers=auth_headers)
    assert response.status_code == 200
    assert "puffs_today" in response.json()


def test_list_check_ins_with_date_range(client: TestClient, auth_headers: dict):
    today = date.today()
    yesterday = today - timedelta(days=1)
    assert client.post(
        "/v1/check-ins",
        json={"date": yesterday.isoformat(), "daily_night_symp": True},
        headers=auth_headers,
    ).status_code == 201
    assert client.post("/v1/check-ins/inhaler/puff", headers=auth_headers).status_code == 200

    listed = client.get(
        "/v1/check-ins",
        params={"from": yesterday.isoformat(), "to": today.isoformat()},
        headers=auth_headers,
    )
    assert listed.status_code == 200, listed.text
    items = listed.json()["items"]
    assert len(items) >= 2
    dates = {item["date"] for item in items}
    assert yesterday.isoformat() in dates
    assert today.isoformat() in dates
    scores = {item["date"]: item["symptom_burden_score"] for item in items}
    assert scores[yesterday.isoformat()] == 1
    assert scores[today.isoformat()] == 1


def test_symptom_burden_score_caps_inhaler_points(client: TestClient, auth_headers: dict):
    check_in = client.post(
        "/v1/check-ins",
        json={
            "daily_day_symp": True,
            "daily_night_symp": True,
            "daily_limit_activity": True,
        },
        headers=auth_headers,
    )
    assert check_in.status_code == 201

    inhaler = client.put(
        "/v1/check-ins/inhaler",
        json={"puffs_today": 10},
        headers=auth_headers,
    )
    assert inhaler.status_code == 200

    today = client.get("/v1/check-ins/today", headers=auth_headers)
    assert today.status_code == 200
    assert today.json()["symptom_burden_score"] == 5

