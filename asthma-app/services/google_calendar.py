"""Google Calendar OAuth + event fetch (read-only, free Calendar API quota)."""

from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import httpx
from jose import JWTError, jwt

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"


def oauth_configured() -> bool:
    return bool(os.getenv("GOOGLE_OAUTH_CLIENT_ID") and os.getenv("GOOGLE_OAUTH_CLIENT_SECRET"))


def redirect_uri() -> str:
    return os.getenv(
        "GOOGLE_OAUTH_REDIRECT_URI",
        "http://127.0.0.1:8000/v1/calendar/callback",
    )


def frontend_redirect_url() -> str:
    # Default to an API-hosted page so OAuth works without Vite running on :5173.
    return os.getenv(
        "GOOGLE_OAUTH_FRONTEND_REDIRECT",
        "http://127.0.0.1:8000/v1/calendar/oauth-done",
    )


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET is required for calendar OAuth state")
    return secret


def create_oauth_state(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    return jwt.encode(
        {"sub": user_id, "purpose": "google_calendar_oauth", "exp": expire},
        _jwt_secret(),
        algorithm="HS256",
    )


def decode_oauth_state(state: str) -> str | None:
    try:
        payload = jwt.decode(state, _jwt_secret(), algorithms=["HS256"])
    except JWTError:
        return None
    if payload.get("purpose") != "google_calendar_oauth" or "sub" not in payload:
        return None
    return str(payload["sub"])


def build_auth_url(user_id: str) -> str:
    if not oauth_configured():
        raise RuntimeError(
            "Google Calendar OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and "
            "GOOGLE_OAUTH_CLIENT_SECRET."
        )
    params = {
        "client_id": os.environ["GOOGLE_OAUTH_CLIENT_ID"],
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": CALENDAR_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": create_oauth_state(user_id),
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    data = {
        "code": code,
        "client_id": os.environ["GOOGLE_OAUTH_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_OAUTH_CLIENT_SECRET"],
        "redirect_uri": redirect_uri(),
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> str:
    data = {
        "client_id": os.environ["GOOGLE_OAUTH_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_OAUTH_CLIENT_SECRET"],
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        response.raise_for_status()
        payload = response.json()
    access = payload.get("access_token")
    if not access:
        raise RuntimeError("Google did not return an access_token")
    return access


async def fetch_google_email(access_token: str) -> str | None:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if response.status_code >= 400:
            return None
        return response.json().get("email")


def _parse_event(raw: dict[str, Any]) -> dict[str, Any]:
    start = raw.get("start") or {}
    end = raw.get("end") or {}
    all_day = "date" in start and "dateTime" not in start
    return {
        "id": raw.get("id"),
        "title": raw.get("summary") or "(No title)",
        "start": start.get("dateTime") or start.get("date"),
        "end": end.get("dateTime") or end.get("date"),
        "all_day": all_day,
        "location": raw.get("location"),
        "description": raw.get("description"),
        "status": raw.get("status"),
        "html_link": raw.get("htmlLink"),
        "hangout_link": raw.get("hangoutLink"),
    }


async def fetch_events_for_day(
    refresh_token: str,
    *,
    day: date,
    timezone_name: str = "America/Chicago",
) -> list[dict[str, Any]]:
    """Fetch primary-calendar events overlapping the given local calendar day."""
    access_token = await refresh_access_token(refresh_token)
    # Bound the day in the user's local timezone (exclusive end).
    try:
        tz = ZoneInfo(timezone_name)
    except Exception:
        tz = ZoneInfo("America/Chicago")
    start_local = datetime(day.year, day.month, day.day, tzinfo=tz)
    end_local = start_local + timedelta(days=1)

    params = {
        "timeMin": start_local.isoformat(),
        "timeMax": end_local.isoformat(),
        "singleEvents": "true",
        "orderBy": "startTime",
        "maxResults": 50,
        "timeZone": timezone_name,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            GOOGLE_EVENTS_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
        )
        response.raise_for_status()
        payload = response.json()

    items = payload.get("items") or []
    return [_parse_event(item) for item in items if item.get("status") != "cancelled"]


def events_to_summary(events: list[dict[str, Any]] | None) -> str | None:
    if not events:
        return None
    parts: list[str] = []
    for event in events:
        title = event.get("title") or "(No title)"
        start = event.get("start") or "?"
        end = event.get("end") or "?"
        location = event.get("location")
        if event.get("all_day"):
            line = f"{title} (all day {start})"
        else:
            line = f"{title} ({start} → {end})"
        if location:
            line += f" @ {location}"
        parts.append(line)
    return "; ".join(parts)


def format_events_for_prompt(events: list[dict[str, Any]] | None) -> str:
    if not events:
        return "none"
    lines: list[str] = []
    for i, event in enumerate(events, start=1):
        lines.append(
            f"{i}. title={event.get('title')!r}, start={event.get('start')}, "
            f"end={event.get('end')}, all_day={event.get('all_day')}, "
            f"location={event.get('location')!r}, "
            f"description={event.get('description')!r}, status={event.get('status')}"
        )
    return "\n".join(lines)
