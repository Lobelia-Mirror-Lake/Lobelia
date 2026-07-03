# Mirror Lake — Backend API Specification

**Audience:** Frontend team, backend implementers  
**Scope:** Backend only (Figma is reference context; page layout is not binding)  
**Storage:** PostgreSQL (user data, check-ins, episodes)  
**Last updated:** 2026-06-29

This document describes **what exists today**, **what we are building next**, and **how pieces connect**. Existing prediction routes (`/predict/classifier`, `/predict`) are owned by another developer — **do not change them**; new product flows use the endpoints in [§4 New endpoints](#4-new-endpoints-to-build).

Related docs:

- [ENV_API_DESIGN.md](./ENV_API_DESIGN.md) — environment feature parity with training data
- [ELENA_HANDOFF.md](./ELENA_HANDOFF.md) — model artifacts

---

## Table of contents

1. [Architecture overview](#1-architecture-overview)
2. [Design decisions](#2-design-decisions)
3. [Existing endpoints (leave as-is)](#3-existing-endpoints-leave-as-is)
4. [New endpoints to build](#4-new-endpoints-to-build)
5. [Rescue inhaler logging (two endpoints)](#5-rescue-inhaler-logging-two-endpoints)
6. [Advice & knowledge layers (RAG)](#6-advice--knowledge-layers-rag)
7. [Data model (PostgreSQL)](#7-data-model-postgresql)
8. [Environment variables](#8-environment-variables)
9. [Error conventions](#9-error-conventions)
10. [Implementation phases](#10-implementation-phases)

---

## 1. Architecture overview

```mermaid
flowchart TB
    subgraph Client["Client (not backend scope)"]
        GPS[GPS lat/lon]
        HK[HealthKit / Health Connect]
        UI[Daily check-in + inhaler UI]
    end

    subgraph Existing["Existing — do not modify"]
        PC[POST /predict/classifier]
        PG[POST /predict]
    end

    subgraph NewAPI["New backend APIs"]
        HEALTH[GET /health]
        ENV[GET /env/daily]
        AUTH[POST /auth/*]
        CHECKIN[POST /check-ins]
        INH_PUFF[POST /check-ins/inhaler/puff]
        INH_SET[PUT /check-ins/inhaler]
        WEAR[POST /wearables/daily]
        FORECAST[POST /forecast]
        ADVICE[advice bundled in /forecast]
    end

    subgraph External["External services"]
        OW[OpenWeather]
        GP[Google Pollen]
        CLAUDE[Claude]
        GEMINI[Gemini]
    end

    subgraph Store["PostgreSQL"]
        DB[(users · check_ins · inhaler_logs · wearables · episodes)]
    end

    subgraph ML["Risk engine"]
        XGB[Global XGBoost classifier]
    end

    subgraph RAG["Advice pipeline"]
        L1[Layer 1: GINA / NHLBI]
        L2[Layer 2: CDC / ALA]
        L3[Layer 3: User episode history]
        LLM[Claude or Gemini]
    end

    GPS --> ENV
    ENV --> OW
    ENV --> GP
    UI --> INH_PUFF
    UI --> INH_SET
    UI --> CHECKIN
    HK --> WEAR

    CHECKIN --> DB
    INH_PUFF --> DB
    INH_SET --> DB
    WEAR --> DB
    AUTH --> DB

    FORECAST --> ENV
    FORECAST --> DB
    FORECAST --> XGB
    XGB --> RAG
    L1 --> RAG
    L2 --> RAG
    L3 --> DB
    DB --> L3
    RAG --> CLAUDE
    RAG --> GEMINI
    FORECAST --> ADVICE

    PC -.->|legacy / research| XGB
    PG -.->|GINA fallback| XGB
```

### Daily user flow (target)

```mermaid
sequenceDiagram
    participant User
    participant App
    participant API
    participant DB
    participant Env as OpenWeather + Google Pollen
    participant LLM as Claude or Gemini

    User->>App: Tap "Used rescue inhaler" (+1 puff)
    App->>API: POST /check-ins/inhaler/puff
    API->>DB: Increment today's puff count
    API-->>App: { puffs_today: 2, ... }

    User->>App: Complete symptom check-in
    App->>API: POST /check-ins { daily_day_symp, ... }
    API->>DB: Upsert today's check-in
    API-->>App: 201 Created

    User->>App: Open Home
    App->>API: POST /forecast { user_id, lat, lon }
    API->>DB: Load today check-in + yesterday wearables
    API->>Env: Fetch env (or cache)
    API->>API: Classifier → risk + contributing_factors
    API->>DB: Query Layer 3 episode patterns
    API->>LLM: KB chunks + user history + risk context
    LLM-->>API: Structured advice + disclaimer
    API-->>App: Tomorrow risk + advice (automatic)
```

---

## 2. Design decisions

| Topic | Decision |
|-------|----------|
| Prediction routes | Keep `POST /predict/classifier` and `POST /predict` unchanged |
| Primary product endpoint | **`POST /forecast`** — tomorrow risk + advice for Home (new) |
| Architecture | Stateless scoring per request; **PostgreSQL** for user history (RAG Layer 3) |
| Location | Client sends `lat` / `lon` from device GPS |
| Environment (prod) | **OpenWeather** (weather + AQ) + **Google Pollen API** |
| Environment (dev) | Open-Meteo (free, see ENV_API_DESIGN.md) |
| PEF / peak flow | **Out of scope** — not collected, not in classifier |
| Edge (personal) model | **Phase 5** — after core backend; good school showcase |
| Accounts | **Required** — JWT auth; health logs on server (not localStorage-only) |
| Advice | **Always included** on `POST /forecast` for Home |
| LLM providers | **Claude** and **Gemini** (configurable via `LLM_PROVIDER`) |
| Check-in before forecast | **Recommended** — `POST /forecast` returns `400` if today's check-in incomplete |

---

## 3. Existing endpoints (leave as-is)

These are implemented in `api/main.py`. Document for integration reference only.

### `GET /health`

Returns API status and whether the classifier artifact is loaded.

### `POST /predict/classifier`

XGBoost flare classifier. Full env + optional wearable lags. See `api/schemas.py` (`ClassifierInput`).

- Nullable sensor fields: send JSON `null`, **not** `0`, when unknown
- Optional `?include_advice=true` (Claude only today)

### `POST /predict`

GINA cold-start fallback for new users. See `api/predict.py` (`PatientInput`).

---

## 4. New endpoints to build

All new routes require authentication unless noted. Base path: `/v1` (recommended prefix for new APIs).

### System

| Method | Path | Auth | Status | Description |
|--------|------|------|--------|-------------|
| `GET` | `/health` | No | Live | Unchanged |
| `GET` | `/v1/env/daily` | Optional | Built*, not wired | Elena-compatible env row for `lat`, `lon`, `date` |

\* `api/env.py` + `services/env_fetcher.py` exist; register route in `main.py`.

**`GET /v1/env/daily`**

| Query | Required | Description |
|-------|----------|-------------|
| `lat` | yes | WGS84 latitude |
| `lon` | yes | WGS84 longitude |
| `date` | no | `YYYY-MM-DD`, default today |
| `provider` | no | `openweather` (prod) or `openmeteo` (dev) |

Response: see [ENV_API_DESIGN.md](./ENV_API_DESIGN.md#response-envdailyresponse).

---

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/auth/register` | Create account |
| `POST` | `/v1/auth/login` | Returns JWT access token |
| `POST` | `/v1/auth/refresh` | Refresh token (optional) |
| `GET` | `/v1/users/me` | Profile + trigger sensitivities |
| `PATCH` | `/v1/users/me` | Update profile, triggers, care goals |

**Register body (example):**

```json
{
  "email": "user@example.com",
  "password": "...",
  "name": "Elena M.",
  "date_of_birth": "1998-03-15",
  "emergency_contact": "Alex M. — 555-0100",
  "preferred_reminder": "08:00",
  "contact_method": "Email",
  "preferred_environment": "Low-pollen mornings",
  "care_goal": "Keep symptoms stable during exercise",
  "accessibility_needs": "Large text and clear contrast",
  "trigger_preferences": ["Pollen", "Exercise", "Cold air"],
  "trigger_sensitivities": {
    "pollen": 0.8,
    "cold_air": 0.5,
    "dust": 0.3,
    "exercise": 0.7
  }
}
```

---

### Daily check-in

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/check-ins` | Upsert today's symptom log |
| `GET` | `/v1/check-ins` | List history (`?from=&to=`) |
| `GET` | `/v1/check-ins/today` | Today's merged check-in + inhaler total |

**`POST /v1/check-ins` body:**

```json
{
  "date": "2026-06-29",
  "daily_day_symp": false,
  "daily_night_symp": true,
  "daily_limit_activity": false,
  "notes": "Tight chest after walk",
  "triggers": ["Pollen", "Exercise"],
  "calendar_event": "Outdoor soccer tomorrow"
}
```

**Note:** Inhaler puffs are **not** set here — use the [two inhaler endpoints](#5-rescue-inhaler-logging-two-endpoints).

Server derives for the ML model:

```text
is_flare_up = (puffs_today >= 3) OR (daily_day_symp AND daily_night_symp AND daily_limit_activity)
```

`puffs_today` comes from the inhaler endpoints (sum of button taps or manual override).

---

### Wearables

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/wearables/daily` | Ingest yesterday's aggregates (HealthKit sync) |

```json
{
  "date": "2026-06-28",
  "sleep_minutes": 390,
  "total_steps": 6200,
  "sedentary_minutes": 480,
  "running_minutes": 15,
  "avg_hr": 71
}
```

Lag fields map to classifier nullable features (`*_lag`). Send from mobile when available; `null` is fine.

---

### Forecast (Home screen — primary new endpoint)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/forecast` | Tomorrow flare risk + contributing factors + advice |

Does **not** replace `/predict/classifier`; internally reuses the same classifier logic and env fetcher.

**Request:**

```json
{
  "lat": 42.36,
  "lon": -71.06,
  "date": "2026-06-29",
  "llm_provider": "gemini"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `lat`, `lon` | yes | Device GPS |
| `date` | no | Forecast anchor date (default today) |
| `llm_provider` | no | `claude` \| `gemini` (default from `LLM_PROVIDER` env) |

Server loads from DB: today's check-in, `puffs_today`, yesterday's wearables, user trigger sensitivities.

**Response `200`:**

```json
{
  "date": "2026-06-29",
  "forecast_for": "2026-06-30",
  "prediction_mode": "classifier",
  "flare_probability": 0.68,
  "predicted_flare_tomorrow": true,
  "risk_level": "Medium",
  "contributing_factors": [
    "High tree pollen",
    "Night symptoms today",
    "Rescue inhaler used twice"
  ],
  "top_features": ["is_flare_up", "humidity", "pm2_5"],
  "cold_start": false,
  "missing_features": [],
  "warnings": [],
  "advice": {
    "summary": "Pollen is high and you reported night symptoms — patterns like this have preceded cough and more inhaler use for you before.",
    "sections": [
      {
        "title": "Before tomorrow's activity",
        "body": "Consider rest tonight and follow your asthma action plan before outdoor soccer."
      },
      {
        "title": "During activity",
        "body": "Watch for worsening cough, wheezing, or chest tightness; reduce intensity if symptoms increase."
      },
      {
        "title": "After activity",
        "body": "Monitor symptoms through the evening; night symptoms have followed similar days in your log."
      }
    ],
    "disclaimer": "This information is for educational purposes only and is not a medical diagnosis. Follow your clinician's asthma action plan.",
    "llm_provider": "gemini",
    "knowledge_sources_used": ["GINA", "CDC", "user_history"]
  }
}
```

**Errors:**

| Code | When |
|------|------|
| `400` | Today's check-in missing (prompt user to log symptoms first) |
| `401` | Invalid / missing JWT |
| `502` | Env provider or LLM failure |
| `503` | Classifier artifact missing |

---

## 5. Rescue inhaler logging (two endpoints)

The Home screen needs **two ways** to record rescue inhaler use. Both update the same daily total in PostgreSQL.

### A. Quick button — `POST /v1/check-ins/inhaler/puff`

**Use case:** User taps **"I used my rescue inhaler"** — logs **one puff** (or one actuation).

**Request:** empty body or optional metadata:

```json
{
  "date": "2026-06-29",
  "recorded_at": "2026-06-29T14:32:00Z"
}
```

**Behavior:**

1. Append one row to `inhaler_events` (audit trail)
2. Increment `check_ins.puffs_today` for that user/date
3. Return updated daily total

**Response `200`:**

```json
{
  "date": "2026-06-29",
  "puffs_today": 3,
  "event_id": "uuid",
  "is_flare_up_threshold": true,
  "message": "Logged 1 puff. Today's total: 3."
}
```

`is_flare_up_threshold`: `true` when `puffs_today >= 3` (matches training label logic).

---

### B. Manual total — `PUT /v1/check-ins/inhaler`

**Use case:** User types **"I used my inhaler 4 times today"** (sets the full day count).

**Request:**

```json
{
  "date": "2026-06-29",
  "puffs_today": 4
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `puffs_today` | int | `>= 0`, reasonable max e.g. `<= 50` |

**Behavior:**

1. Set `check_ins.puffs_today` to the given value (overwrite, not increment)
2. Optionally log a `manual_override` event in `inhaler_events`
3. If count **decreases**, reconcile or replace events per product rule (document: manual wins)

**Response `200`:**

```json
{
  "date": "2026-06-29",
  "puffs_today": 4,
  "source": "manual",
  "is_flare_up_threshold": true
}
```

---

### AAMOS questionnaire codes (legacy reference)

Training data used questionnaire **codes**, not raw counts:

```python
# model/feature_engineering.py
INHALER_MAPPING = {0: 0, 1: 1.5, 3: 3.5, 5: 6.5, 9: 10.5, 12: 12}
```

**New APIs use integer puff counts** (`puffs_today`). The server maps to `is_flare_up` with `puffs_today >= 3`. If `/predict/classifier` still expects `relief_inhaler` codes, the forecast service can map approximate codes when calling the legacy endpoint internally.

---

## 6. Advice & knowledge layers (RAG)

### What is Layer 3?

The knowledge system has three layers:

| Layer | Source | Role |
|-------|--------|------|
| **Layer 1 — Medical** | GINA, NHLBI severe asthma guide | Clinical pathophysiology, guideline-backed facts |
| **Layer 2 — Management** | CDC, American Lung Association, NHLBI living-with | Practical trigger reduction, exercise, monitoring |
| **Layer 3 — Personalized user context** | **Your PostgreSQL logs + risk output** | The differentiator |

**Layer 3** is what makes advice personal. Instead of only:

> "Pollen is high today."

The system can say:

> "Pollen is high today, and the last three times pollen exceeded your typical range you reported increased wheezing and used your rescue inhaler."

Layer 3 is built by **querying the user's stored history**, not by scraping the web:

- Past check-ins (symptoms, triggers, `puffs_today`)
- Past env snapshots on high-risk days
- Past forecasts vs. what actually happened (when outcome feedback exists)

Example episode summary injected into the LLM prompt:

```text
[Document 3: Personalized Patient History]
Source: Internal Risk Engine & User Logs
Over the last 12 months, 3 episodes matched: high pollen + poor sleep.
In 100% of those cases, the user reported increasing cough within 24 hours,
followed by rescue inhaler use and night symptoms.
```

### Retrieval strategy (v1)

The knowledge base is **small** — full vector RAG is optional. Recommended v1:

1. **Static chunks** — pre-extract ~5–10 short passages per layer at deploy time (`knowledge/` directory or DB table `kb_chunks`)
2. **Rule-based selection** — pick chunks by tags matching `contributing_factors` (e.g. `pollen`, `sleep`, `exercise`)
3. **Layer 3 SQL** — parameterized queries over `check_ins` + `env_snapshots` for pattern summaries
4. **LLM** — Claude or Gemini with structured output (summary + sections + disclaimer)

### LLM providers

| Provider | Env var | Default model (suggested) |
|----------|---------|---------------------------|
| Claude | `ANTHROPIC_API_KEY` | `claude-3-5-haiku-latest` |
| Gemini | `GEMINI_API_KEY` | `gemini-2.0-flash` |

| Env var | Description |
|---------|-------------|
| `LLM_PROVIDER` | Default: `claude` or `gemini` |
| Per-request override | `llm_provider` on `POST /v1/forecast` |

**Prompt template (sketch):**

```text
You are an asthma management assistant.

User context:
- Risk level: {risk_level}
- Contributing factors: {contributing_factors}
- Calendar event: {calendar_event}
- Symptoms today: {symptoms_summary}
- Rescue inhaler today: {puffs_today} puffs

Retrieved knowledge:
[Layer 1 chunk]
[Layer 2 chunk]
[Layer 3 user episode summary]

Task: Explain possible causes and provide recommendations.
Do not provide a medical diagnosis.
Return JSON: { summary, sections: [{title, body}], disclaimer }
```

### Optional: `POST /v1/advice`

Regenerate advice without re-running the classifier (same RAG pipeline, cached risk payload). Lower priority than bundling advice into `/v1/forecast`.

---

## 7. Data model (PostgreSQL)

### Core tables

```text
users
  id UUID PK
  email UNIQUE
  password_hash
  name
  date_of_birth DATE
  emergency_contact TEXT
  preferred_reminder TEXT
  contact_method TEXT
  preferred_environment TEXT
  care_goal TEXT
  accessibility_needs TEXT
  trigger_preferences TEXT[]
  trigger_sensitivities JSONB
  created_at, updated_at

check_ins
  id UUID PK
  user_id FK → users
  date DATE
  daily_day_symp BOOLEAN
  daily_night_symp BOOLEAN
  daily_limit_activity BOOLEAN
  puffs_today INT DEFAULT 0
  notes TEXT
  triggers TEXT[]
  calendar_event TEXT
  UNIQUE (user_id, date)

inhaler_events
  id UUID PK
  user_id FK
  check_in_id FK → check_ins
  event_type ENUM('puff', 'manual_override')
  puffs_delta INT          -- +1 for button; 0 for manual set
  puffs_total_after INT
  recorded_at TIMESTAMPTZ

wearables_daily
  user_id FK
  date DATE
  sleep_minutes, total_steps, sedentary_minutes, running_minutes, avg_hr
  UNIQUE (user_id, date)

env_snapshots
  user_id FK
  date DATE
  lat, lon, provider
  features JSONB           -- 19 env columns
  missing TEXT[]

forecasts
  id UUID PK
  user_id FK
  date DATE
  forecast_for DATE
  flare_probability FLOAT
  risk_level TEXT
  contributing_factors JSONB
  advice JSONB
  created_at

kb_chunks                    -- optional; or flat files at deploy
  id, layer INT, tags TEXT[], title, body TEXT
```

---

## 8. Environment variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mirror_lake

# JWT
JWT_SECRET=...
JWT_EXPIRE_MINUTES=10080

# LLM
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
LLM_PROVIDER=gemini

# Environment (prod)
OPENWEATHER_API_KEY=...
GOOGLE_POLLEN_API_KEY=...
ENV_PROVIDER=openweather
ENV_CACHE_TTL_SECONDS=21600
```

---

## 9. Error conventions

| Code | Meaning |
|------|---------|
| `400` | Validation error, missing today's check-in |
| `401` | Unauthorized |
| `404` | User or resource not found |
| `409` | Conflict (e.g. duplicate email) |
| `502` | External provider (env, LLM) failure |
| `503` | Classifier artifact not loaded |

Standard error body:

```json
{
  "detail": "Human-readable message",
  "code": "CHECK_IN_REQUIRED"
}
```

---

## 10. Implementation phases

| Phase | Deliverables |
|-------|----------------|
| **1 — Env** | Wire `GET /v1/env/daily`; OpenWeather + Google Pollen providers |
| **2 — Data** | Postgres schema; auth; `POST /v1/check-ins`; **inhaler puff + set endpoints** |
| **3 — Forecast** | `POST /v1/forecast` (classifier + env + DB assembly) |
| **4 — Advice** | RAG pipeline; Layer 1–2 static KB; **Layer 3 episode SQL**; Claude + Gemini |
| **5 — Wearables** | `POST /v1/wearables/daily` |
| **6 — Edge AI** | Per-user model training + routing (school showcase; optional) |

### Out of scope (v1)

- PEF / peak flow
- Modifying `/predict/classifier` or `/predict`
- Frontend implementation
- Vector database / embedding retrieval (optional later)

---

## Quick reference — endpoint summary

| Method | Path | Status |
|--------|------|--------|
| `GET` | `/health` | Live |
| `POST` | `/predict/classifier` | Live — do not change |
| `POST` | `/predict` | Live — do not change |
| `GET` | `/v1/env/daily` | Build / wire |
| `POST` | `/v1/auth/register` | Planned |
| `POST` | `/v1/auth/login` | Planned |
| `GET` | `/v1/users/me` | Planned |
| `PATCH` | `/v1/users/me` | Planned |
| `POST` | `/v1/check-ins` | Planned |
| `GET` | `/v1/check-ins` | Planned |
| `GET` | `/v1/check-ins/today` | Planned |
| **`POST`** | **`/v1/check-ins/inhaler/puff`** | **Planned — quick button (+1)** |
| **`PUT`** | **`/v1/check-ins/inhaler`** | **Planned — manual daily total** |
| `POST` | `/v1/wearables/daily` | Planned |
| **`POST`** | **`/v1/forecast`** | **Planned — Home risk + advice** |
| `POST` | `/v1/advice` | Optional |
