"""Context providers used by the Copilot recommendation graph."""

from __future__ import annotations

import json
import re
import uuid
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from copilot.state import (
    AdviceType,
    CalendarEvent,
    HistoricalEpisode,
    HistoryContext,
    InsightsContext,
    KnowledgeChunk,
    KnowledgeAudience,
    PersonalInsight,
)
from db.models import CheckIn, EnvSnapshot, User, WearableDaily

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"


class CalendarProvider(Protocol):
    """Boundary for the calendar API being developed separately."""

    def get_events(self, user_id: uuid.UUID, start: date, end: date) -> list[CalendarEvent]: ...


class NullCalendarProvider:
    """Production placeholder until an external calendar adapter is injected."""

    def get_events(self, user_id: uuid.UUID, start: date, end: date) -> list[CalendarEvent]:
        return []


class ManualCalendarProvider:
    """Uses the free-text calendar_event from today's check-in (v1 calendar input)."""

    def __init__(self, calendar_event: str | None, event_date: date):
        title = (calendar_event or "").strip()
        self._events: list[CalendarEvent] = (
            [CalendarEvent(title=title, start=event_date, source="manual")]
            if title
            else []
        )

    def get_events(self, user_id: uuid.UUID, start: date, end: date) -> list[CalendarEvent]:
        return [event for event in self._events if start <= _event_date(event) <= end]


class MockCalendarProvider:
    """Deterministic calendar provider for tests and local graph demos."""

    def __init__(self, events: list[CalendarEvent | dict[str, Any]]):
        self._events = [event if isinstance(event, CalendarEvent) else CalendarEvent.model_validate(event) for event in events]

    def get_events(self, user_id: uuid.UUID, start: date, end: date) -> list[CalendarEvent]:
        return [event for event in self._events if start <= _event_date(event) <= end]


class PreloadedEnvironmentProvider:
    def __init__(self, environment: dict[str, Any]):
        self._environment = environment

    def get_daily(self) -> dict[str, Any]:
        return dict(self._environment)


class ProfileProvider:
    def __init__(self, user: User):
        self._user = user

    def get_profile(self) -> dict[str, Any]:
        return {
            "preferred_environment": self._user.preferred_environment,
            "care_goal": self._user.care_goal,
            "known_triggers": list(self._user.trigger_preferences or []),
            "trigger_sensitivities": dict(self._user.trigger_sensitivities or {}),
        }


def _event_date(event: CalendarEvent) -> date:
    return event.start if isinstance(event.start, date) and not hasattr(event.start, "date") else event.start.date()


_SEARCH_STOPWORDS = {
    "asthma",
    "average",
    "elevated",
    "high",
    "increased",
    "level",
    "low",
    "recent",
    "recorded",
    "risk",
    "symptoms",
    "today",
}


def _tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", value.lower())
        if len(token) > 2 and token not in _SEARCH_STOPWORDS
    }


def _symptoms(row: CheckIn | None) -> list[str]:
    if row is None:
        return []
    values: list[str] = []
    if row.daily_day_symp:
        values.append("daytime symptoms")
    if row.daily_night_symp:
        values.append("nighttime symptoms")
    if row.daily_limit_activity:
        values.append("activity limitation")
    return values


def _environment_matches(current: dict[str, Any], historical: dict[str, Any]) -> list[str]:
    matches: list[str] = []
    for key in ("tree_pollen", "grass_pollen", "weed_pollen"):
        current_level = str(current.get(key, "")).lower()
        previous_level = str(historical.get(key, "")).lower()
        if current_level in {"high", "very high"} and previous_level in {"high", "very high"}:
            matches.append(key)
    current_aqi = current.get("aqi")
    previous_aqi = historical.get("aqi")
    if isinstance(current_aqi, (int, float)) and isinstance(previous_aqi, (int, float)):
        if current_aqi >= 3 and previous_aqi >= 3:
            matches.append("elevated_aqi")
    return matches


class RelevantHistoryProvider:
    """Retrieve compact evidence for the prompt and a larger private analysis pool."""

    def __init__(
        self,
        db: Session,
        user_id: uuid.UUID,
        *,
        default_lookback_days: int = 56,
        maximum_lookback_days: int = 365,
        max_examples: int = 5,
    ):
        self.db = db
        self.user_id = user_id
        self.default_lookback_days = default_lookback_days
        self.maximum_lookback_days = maximum_lookback_days
        self.max_examples = max_examples

    def get_relevant_history(
        self,
        *,
        anchor_date: date,
        forecast: dict[str, Any],
        calendar: list[dict[str, Any]],
        environment: dict[str, Any],
        question: str | None = None,
        lookback_days: int | None = None,
    ) -> tuple[HistoryContext, list[HistoricalEpisode]]:
        days = min(max(1, lookback_days or self.default_lookback_days), self.maximum_lookback_days)
        since = anchor_date - timedelta(days=days)
        check_ins = list(
            self.db.scalars(
                select(CheckIn)
                .where(
                    CheckIn.user_id == self.user_id,
                    CheckIn.date >= since,
                    CheckIn.date < anchor_date,
                )
                .order_by(CheckIn.date.asc())
            ).all()
        )
        wearables = {
            row.date: row
            for row in self.db.scalars(
                select(WearableDaily).where(
                    WearableDaily.user_id == self.user_id,
                    WearableDaily.date >= since - timedelta(days=1),
                    WearableDaily.date < anchor_date,
                )
            ).all()
        }
        environments = {
            row.date: row.features or {}
            for row in self.db.scalars(
                select(EnvSnapshot).where(
                    EnvSnapshot.user_id == self.user_id,
                    EnvSnapshot.date >= since,
                    EnvSnapshot.date < anchor_date,
                )
            ).all()
        }
        by_date = {row.date: row for row in check_ins}

        query_tokens: set[str] = set()
        for factor in forecast.get("contributing_factors", []):
            query_tokens |= _tokens(str(factor))
        for event in calendar:
            query_tokens |= _tokens(str(event.get("title", "")))
        if question:
            query_tokens |= _tokens(question)

        analysis_pool: list[HistoricalEpisode] = []
        for row in check_ins:
            event_names = [row.calendar_event] if row.calendar_event else []
            historical_env = environments.get(row.date, {})
            matched_on: list[str] = []
            score = max(0.0, 1.0 - ((anchor_date - row.date).days / days)) * 0.5

            row_tokens = _tokens(" ".join(event_names + list(row.triggers or [])))
            shared_tokens = sorted(query_tokens & row_tokens)
            if shared_tokens:
                matched_on.extend(f"term:{token}" for token in shared_tokens)
                score += 3.0 * len(shared_tokens)

            env_matches = _environment_matches(environment, historical_env)
            if env_matches:
                matched_on.extend(f"environment:{value}" for value in env_matches)
                score += 2.0 * len(env_matches)

            same_day = _symptoms(row)
            next_day = _symptoms(by_date.get(row.date + timedelta(days=1)))
            if same_day or next_day or row.puffs_today:
                score += 0.5

            wearable = wearables.get(row.date - timedelta(days=1))
            analysis_pool.append(
                HistoricalEpisode(
                    date=row.date,
                    events=event_names,
                    environment=historical_env,
                    sleep_minutes=wearable.sleep_minutes if wearable else None,
                    symptoms_same_day=same_day,
                    symptoms_next_day=next_day,
                    puffs_today=row.puffs_today,
                    triggers=list(row.triggers or []),
                    matched_on=matched_on,
                    relevance_score=round(score, 3),
                )
            )

        ranked = sorted(
            analysis_pool,
            key=lambda episode: (episode.relevance_score, episode.date),
            reverse=True,
        )[: self.max_examples]
        return (
            HistoryContext(
                window_days=days,
                episodes=ranked,
                metric_windows=self._metric_windows(check_ins, wearables),
            ),
            analysis_pool,
        )

    @staticmethod
    def _metric_windows(
        check_ins: list[CheckIn],
        wearables: dict[date, WearableDaily],
    ) -> dict[str, list[dict[str, Any]]]:
        recent = check_ins[-7:]
        return {
            "symptoms": [
                {
                    "date": row.date.isoformat(),
                    "daytime": row.daily_day_symp,
                    "nighttime": row.daily_night_symp,
                    "activity_limitation": row.daily_limit_activity,
                }
                for row in recent
            ],
            "rescue_inhaler": [
                {"date": row.date.isoformat(), "puffs": row.puffs_today}
                for row in recent
            ],
            "sleep": [
                {
                    "date": row.date.isoformat(),
                    "minutes": (
                        wearables[row.date - timedelta(days=1)].sleep_minutes
                        if row.date - timedelta(days=1) in wearables
                        else None
                    ),
                }
                for row in recent
            ],
        }


class PersonalInsightsProvider:
    """Compute transparent associations and trends; never infer causality."""

    def compute(
        self,
        history: HistoryContext,
        analysis_pool: list[HistoricalEpisode],
    ) -> InsightsContext:
        patterns: list[PersonalInsight] = []
        event_groups: dict[str, list[HistoricalEpisode]] = defaultdict(list)
        for episode in analysis_pool:
            for event in episode.events:
                event_groups[event.strip().lower()].append(episode)

        for normalized, episodes in event_groups.items():
            if len(episodes) < 2:
                continue
            symptoms_after = sum(
                bool(episode.symptoms_same_day or episode.symptoms_next_day)
                for episode in episodes
            )
            label = episodes[0].events[0]
            patterns.append(
                PersonalInsight(
                    kind="pattern",
                    label=label,
                    statement=(
                        f"{symptoms_after} of {len(episodes)} '{label}' events were followed "
                        "by symptoms on the same or next daily check-in."
                    ),
                    evidence_strength=_evidence_strength(len(episodes)),
                    statistics={
                        "occurrences": len(episodes),
                        "symptoms_within_approx_24h": symptoms_after,
                        "window_days": history.window_days,
                    },
                    supporting_dates=[episode.date for episode in episodes],
                )
            )

        trends: list[PersonalInsight] = []
        symptom_window = history.metric_windows.get("symptoms", [])
        consecutive_nights = 0
        for item in reversed(symptom_window):
            if item.get("nighttime"):
                consecutive_nights += 1
            else:
                break
        if consecutive_nights >= 2:
            trends.append(
                PersonalInsight(
                    kind="trend",
                    label="Recent nighttime symptoms",
                    statement=f"Nighttime symptoms were logged for {consecutive_nights} consecutive days.",
                    evidence_strength=_evidence_strength(consecutive_nights),
                    statistics={"consecutive_days": consecutive_nights},
                )
            )

        statistics: list[PersonalInsight] = []
        puff_values = [int(item.get("puffs") or 0) for item in history.metric_windows.get("rescue_inhaler", [])]
        if puff_values:
            statistics.append(
                PersonalInsight(
                    kind="statistic",
                    label="Recent rescue inhaler use",
                    statement=f"{sum(puff_values)} rescue puffs were logged across {len(puff_values)} recent days.",
                    evidence_strength=_evidence_strength(len(puff_values)),
                    statistics={
                        "total_puffs": sum(puff_values),
                        "days_observed": len(puff_values),
                        "daily_average": round(sum(puff_values) / len(puff_values), 2),
                    },
                )
            )

        sleep_values = [
            int(item["minutes"])
            for item in history.metric_windows.get("sleep", [])
            if item.get("minutes") is not None
        ]
        if sleep_values:
            statistics.append(
                PersonalInsight(
                    kind="statistic",
                    label="Recent sleep",
                    statement=f"Average recorded sleep was {round(sum(sleep_values) / len(sleep_values))} minutes.",
                    evidence_strength=_evidence_strength(len(sleep_values)),
                    statistics={
                        "average_minutes": round(sum(sleep_values) / len(sleep_values)),
                        "days_observed": len(sleep_values),
                    },
                )
            )

        return InsightsContext(patterns=patterns, trends=trends, statistics=statistics)


def _evidence_strength(occurrences: int) -> str:
    if occurrences >= 8:
        return "high"
    if occurrences >= 5:
        return "moderate"
    if occurrences >= 3:
        return "low"
    return "insufficient"


class MedicalKnowledgeProvider:
    """Small JSON retriever with a contract that can later back onto embeddings."""

    def __init__(self, knowledge_dir: Path = KNOWLEDGE_DIR):
        self.knowledge_dir = knowledge_dir

    def search(
        self,
        query_terms: list[str],
        limit: int = 4,
        *,
        advice_type: AdviceType = "daily",
        audience: KnowledgeAudience = "patient",
    ) -> list[KnowledgeChunk]:
        chunks = [
            chunk
            for chunk in self._load()
            if chunk.audience == audience
            and (advice_type == "daily" or advice_type in chunk.advice_types)
        ]
        if not chunks:
            return []

        term_tokens = [_tokens(term) for term in query_terms]
        term_tokens = [tokens for tokens in term_tokens if tokens]
        if not term_tokens:
            return []
        scored: list[tuple[int, KnowledgeChunk]] = []
        for chunk in chunks:
            tag_tokens = _tokens(" ".join(chunk.tags))
            heading_tokens = _tokens(f"{chunk.title} {chunk.section or ''}")
            body_tokens = _tokens(chunk.body)
            score = sum(
                5 * len(tokens & tag_tokens)
                + 3 * len(tokens & heading_tokens)
                + len(tokens & body_tokens)
                for tokens in term_tokens
            )
            scored.append((score, chunk))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [chunk for score, chunk in scored if score >= 3][:limit]

    def _load(self) -> list[KnowledgeChunk]:
        chunks: list[KnowledgeChunk] = []
        generated = self.knowledge_dir / "generated" / "chunks.json"
        paths = (
            (generated,)
            if generated.exists()
            else (
                self.knowledge_dir / "chunks.json",
                self.knowledge_dir / "layer1.json",
                self.knowledge_dir / "layer2.json",
            )
        )
        for path in paths:
            if not path.exists():
                continue
            for index, raw in enumerate(json.loads(path.read_text())):
                chunks.append(
                    KnowledgeChunk(
                        chunk_id=str(raw.get("chunk_id") or f"{path.stem}:{index}"),
                        title=raw["title"],
                        body=raw["body"],
                        publisher=str(raw.get("publisher") or "local"),
                        source_url=raw.get("source_url"),
                        section=raw.get("section"),
                        tags=list(raw.get("tags", [])),
                        audience=raw.get("audience", "patient"),
                        medication_change_allowed=bool(
                            raw.get("medication_change_allowed", False)
                        ),
                        advice_types=list(raw.get("advice_types", ["daily"])),
                    )
                )
        return chunks
