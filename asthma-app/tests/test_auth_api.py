"""Authentication API tests."""

from fastapi.testclient import TestClient


def test_register_and_login(client: TestClient):
    register = client.post(
        "/v1/auth/register",
        json={
            "email": "auth@example.com",
            "password": "password12345",
            "name": "Auth User",
        },
    )
    assert register.status_code == 201
    token = register.json()["access_token"]
    assert token

    login = client.post(
        "/v1/auth/login",
        json={"email": "auth@example.com", "password": "password12345"},
    )
    assert login.status_code == 200
    assert login.json()["access_token"]

    me = client.get("/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "auth@example.com"
    assert me.json()["name"] == "Auth User"


def test_duplicate_email_conflict(client: TestClient):
    payload = {"email": "dup@example.com", "password": "password12345"}
    assert client.post("/v1/auth/register", json=payload).status_code == 201
    dup = client.post("/v1/auth/register", json=payload)
    assert dup.status_code == 409
    assert dup.json()["code"] == "EMAIL_EXISTS"


def test_protected_route_requires_auth(client: TestClient):
    response = client.get("/v1/users/me")
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def test_refresh_token(client: TestClient):
    register = client.post(
        "/v1/auth/register",
        json={"email": "refresh@example.com", "password": "password12345"},
    )
    assert register.status_code == 201
    old_token = register.json()["access_token"]

    refreshed = client.post("/v1/auth/refresh", json={"access_token": old_token})
    assert refreshed.status_code == 200, refreshed.text
    new_token = refreshed.json()["access_token"]
    assert new_token

    me = client.get("/v1/users/me", headers={"Authorization": f"Bearer {new_token}"})
    assert me.status_code == 200


def test_refresh_without_token_returns_401(client: TestClient):
    response = client.post("/v1/auth/refresh", json={})
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"

