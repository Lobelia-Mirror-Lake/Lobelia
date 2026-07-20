#!/usr/bin/env python3
"""Print a compact preview of every Asthma Copilot LangGraph node update.

Run from asthma-app:
  PYTHONPATH=. python scripts/trace_copilot_workflow.py
  PYTHONPATH=. python scripts/trace_copilot_workflow.py --rows 2 --prompt-chars 500
  PYTHONPATH=. python scripts/trace_copilot_workflow.py --live-llm

The script inserts deterministic demo history in the configured PostgreSQL
database and always rolls the transaction back. The default fake LLM avoids
network calls, API costs, and nondeterministic output.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import uuid
from datetime import date, datetime, time, timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from dotenv import load_dotenv
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env", override=False)

from copilot.llm import LLMRegistry  # noqa: E402
from copilot.providers import (  # noqa: E402
    MedicalKnowledgeProvider,
    MockCalendarProvider,
    PersonalInsightsProvider,
    PreloadedEnvironmentProvider,
    ProfileProvider,
    RelevantHistoryProvider,
)
from copilot.state import CalendarEvent, CopilotState  # noqa: E402
from copilot.trace import format_stage_update  # noqa: E402
from copilot.workflow import WorkflowDependencies, build_recommendation_graph  # noqa: E402
from db.database import SessionLocal, init_db  # noqa: E402
from db.models import CheckIn, EnvSnapshot, User, WearableDaily  # noqa: E402


DEMO_ENVIRONMENT = {
    "aqi": 4,
    "pm2_5": 42.0,
    "tree_pollen": "High",
    "grass_pollen": "Low",
    "weed_pollen": "Moderate",
    "humidity": 74.0,
    "temperature": 12.0,
}

DEMO_FORECAST = {
    "risk_level": "High",
    "flare_probability": 0.78,
    "predicted_flare_tomorrow": True,
    "contributing_factors": [
        "High tree pollen",
        "Elevated particulate air pollution",
    ],
    "top_features": [
        {"feature": "tree_pollen", "importance": 0.31},
        {"feature": "pm2_5", "importance": 0.24},
    ],
}

FAKE_ADVICE = {
    "summary": "The demo forecast and context suggest avoiding the anticipated triggers today.",
    "sections": [
        {
            "title": "Plan for today",
            "body": "Monitor symptoms, reduce relevant exposure, and follow your clinician-authored action plan.",
        }
    ],
    "disclaimer": (
        "This information is for educational purposes only and is not a medical diagnosis. "
        "Follow your clinician's asthma action plan."
    ),
}


class FakeTraceModel:
    """Deterministic LangChain-like model used by the trace unless --live-llm is set."""

    async def ainvoke(self, _messages: list[Any]) -> SimpleNamespace:
        return SimpleNamespace(content=json.dumps(FAKE_ADVICE))


def _seed_demo_history(db: Session, anchor_date: date) -> User:
    user = User(
        email=f"copilot-trace-{uuid.uuid4().hex}@example.com",
        password_hash="trace-only",
        name="Copilot Trace Demo",
        preferred_environment="Lower-pollen indoor settings",
        care_goal="Understand anticipated triggers",
        trigger_preferences=["pollen", "air_quality", "exercise"],
        trigger_sensitivities={"pollen": 0.9, "air_quality": 0.8},
    )
    db.add(user)
    db.flush()

    for index, days_ago in enumerate((4, 3, 2, 1)):
        event_date = anchor_date - timedelta(days=days_ago)
        db.add(
            CheckIn(
                user_id=user.id,
                date=event_date,
                daily_day_symp=index < 3,
                daily_night_symp=index >= 1,
                daily_limit_activity=index == 2,
                symptoms_logged=True,
                puffs_today=1 if index < 3 else 0,
                triggers=["pollen", "air_quality"],
                calendar_event="Morning Run",
            )
        )
        db.add(
            WearableDaily(
                user_id=user.id,
                date=event_date - timedelta(days=1),
                sleep_minutes=360 - index * 20,
                total_steps=7000 + index * 500,
                running_minutes=25,
            )
        )
        db.add(
            EnvSnapshot(
                user_id=user.id,
                date=event_date,
                lat=42.36,
                lon=-71.06,
                provider="trace_demo",
                features={
                    "aqi": 4 if index < 3 else 2,
                    "pm2_5": 40.0 if index < 3 else 14.0,
                    "tree_pollen": "High" if index < 3 else "Low",
                },
                missing=[],
            )
        )
    db.flush()
    return user


def _initial_state(question: str | None) -> CopilotState:
    return {
        "forecast": DEMO_FORECAST,
        "calendar": [],
        "environment": {},
        "profile": {},
        "history": {},
        "insights": {},
        "knowledge": [],
        "question": question,
        "advice_type": "daily",
        "audience": "patient",
        "prompt": "",
        "llm_response": {},
        "validated_response": {},
        "warnings": [],
    }


async def trace_workflow(args: argparse.Namespace) -> None:
    anchor_date = args.date or date.today()
    db = SessionLocal()
    try:
        user = _seed_demo_history(db, anchor_date)
        calendar = MockCalendarProvider(
            [
                CalendarEvent(
                    title="Morning Run",
                    start=datetime.combine(anchor_date, time(hour=8)),
                    source="trace_demo",
                )
            ]
        )
        registry = (
            LLMRegistry()
            if args.live_llm
            else LLMRegistry(
                factories={
                    "gemini": FakeTraceModel,
                    "claude": FakeTraceModel,
                },
                retries_per_provider=1,
            )
        )
        dependencies = WorkflowDependencies(
            db=db,
            user=user,
            anchor_date=anchor_date,
            environment_provider=PreloadedEnvironmentProvider(DEMO_ENVIRONMENT),
            history_provider=RelevantHistoryProvider(db, user.id),
            calendar_provider=calendar,
            profile_provider=ProfileProvider(user),
            insights_provider=PersonalInsightsProvider(),
            knowledge_provider=MedicalKnowledgeProvider(),
            llm_registry=registry,
            symptoms_summary="Nighttime cough and some activity limitation",
            puffs_today=1,
        )
        graph = build_recommendation_graph(dependencies)
        accumulated_state: dict[str, Any] = dict(_initial_state(args.question))

        print("Asthma Copilot per-node trace")
        print(f"Anchor date: {anchor_date.isoformat()}")
        print(f"LLM mode: {'LIVE configured providers' if args.live_llm else 'deterministic fake'}")
        print("Demo records are inside a transaction and will be rolled back.")

        async for event in graph.astream(
            _initial_state(args.question),
            stream_mode="updates",
        ):
            for node_name, update in event.items():
                accumulated_state.update(update)
                print(
                    format_stage_update(
                        node_name,
                        update,
                        rows=args.rows,
                        max_string_chars=args.prompt_chars,
                    )
                )

        print("\n" + "=" * 88)
        print("FINAL VALIDATED ADVICE")
        print("-" * 88)
        print(
            json.dumps(
                accumulated_state.get("validated_response", {}),
                indent=2,
                ensure_ascii=False,
                default=str,
            )
        )
    finally:
        db.rollback()
        db.close()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--rows",
        type=int,
        default=3,
        help="Maximum list items shown at each nesting level (default: 3).",
    )
    parser.add_argument(
        "--prompt-chars",
        type=int,
        default=900,
        help="Maximum characters shown for long strings such as the prompt.",
    )
    parser.add_argument(
        "--question",
        default="How should I plan around pollen and poor air quality today?",
        help="Optional demo question included in retrieval and the prompt.",
    )
    parser.add_argument(
        "--date",
        type=date.fromisoformat,
        help="Anchor date in YYYY-MM-DD format (default: today).",
    )
    parser.add_argument(
        "--live-llm",
        action="store_true",
        help="Call configured Gemini/Claude providers instead of the fake model.",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    if not init_db():
        raise SystemExit(
            "PostgreSQL is unavailable. Start it with `docker compose up -d` and retry."
        )
    try:
        asyncio.run(trace_workflow(args))
    except SQLAlchemyError as exc:
        raise SystemExit(f"Could not run Copilot trace: {exc}") from exc


if __name__ == "__main__":
    main()
