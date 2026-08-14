# Lobelia - AI-powered personal asthma management

**Breathe and blossom. Don’t let asthma stop you.**



Lobelia is a personal asthma management platform designed to help people make informed day-to-day decisions while living with asthma.

Rather than focusing only on symptoms, Lobelia brings together personal health information, environmental conditions, and daily plans to forecast short-term asthma risk and provide personalized self-management guidance.

## Demo

[![Lobelia demo](https://img.youtube.com/vi/UaLwAOw6XPY/maxresdefault.jpg)](https://www.youtube.com/watch?v=UaLwAOw6XPY)


## How Lobelia Works

Lobelia combines multiple sources of context to help users make informed decisions about their day:

- **Health & symptoms** — Users can log symptoms, triggers, activity limitations, and other health information.
- **Environmental conditions** — Weather, air quality, and pollen are incorporated as potential contributors to asthma risk.
- **Daily plans** — Optional Google Calendar integration provides context about upcoming activities and events.
- **Risk forecasting** — Machine learning models use these factors to estimate short-term asthma risk.
- **Personalized guidance** — An AI workflow combines the risk forecast with relevant medical knowledge and user context to provide actionable, personalized guidance.

## Core Architecture

Lobelia separates risk prediction from AI-generated guidance:

1. **Data collection** — Health logs, environmental data, and calendar context are collected and processed.
2. **Risk prediction** — A machine learning model estimates short-term asthma risk.
3. **Knowledge retrieval** — Relevant medical information is retrieved from a curated knowledge base.
4. **AI reasoning & guidance** — An LLM-based workflow combines the model output, retrieved knowledge, and user context to generate personalized guidance.

This separation allows the ML model to remain the source of the risk forecast while the AI layer focuses on interpreting the forecast and providing context-aware guidance.

## Tech Stack

### Frontend

- React

### Backend

- Python
- FastAPI
- PostgreSQL

### Machine Learning

- XGBoost
- Pandas
- NumPy

### AI / Retrieval

- LangGraph
- LangChain
- Weaviate
- Google Gemini / Anthropic Claude

### External Data & Integrations

- Weather and environmental APIs
- Google Calendar API

### Deployment

- Google Cloud Run
- Vercel

## Getting started

To run Lobelia locally, use the app READMEs:

| Area | Guide |
| --- | --- |
| **Backend / API / ML** (Postgres, FastAPI, models, env) | [`asthma-app/README.md`](asthma-app/README.md) |
| **Frontend** (React + Vite) | [`asthma-app/frontend/README.md`](asthma-app/frontend/README.md) |

The backend README is the primary quick-start for the full stack (database, migrations, API). After the API is running, start the frontend from `asthma-app/frontend`.

Related docs:

- Copilot / AI workflow: [`asthma-app/copilot/README.md`](asthma-app/copilot/README.md)

## Project Goal

Asthma management happens every day, while clinical care happens only periodically. Lobelia explores how machine learning and AI can support everyday self-management by helping people account for their symptoms, environment, and plans without letting asthma unnecessarily dictate their lives.

## Disclaimer

Lobelia is a research/project prototype intended to provide asthma self-management support and risk forecasts. It is **not** a medical device and does not diagnose, treat, cure, or prevent any disease. It is not a substitute for professional medical advice or an asthma action plan.
