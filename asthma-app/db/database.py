"""Database engine and session management."""

from __future__ import annotations

import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/mirror_lake",
)
# Prefer a direct (non-pooler) URL for Alembic DDL when deploying to Neon/Supabase.
DATABASE_URL_DIRECT = os.getenv("DATABASE_URL_DIRECT", DATABASE_URL)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def database_reachable() -> bool:
    """Return True when a simple SELECT 1 against DATABASE_URL succeeds."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def init_db() -> bool:
    """Deprecated: use Alembic (`alembic upgrade head`). Kept for local test helpers."""
    from db import models  # noqa: F401

    try:
        Base.metadata.create_all(bind=engine)
        _migrate_schema()
        return True
    except Exception:
        return False


def _migrate_schema() -> None:
    """Add columns introduced after initial create (no Alembic yet)."""
    from sqlalchemy import text

    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS symptoms TEXT[]",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS tracking TEXT[]",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_email VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_connected_at TIMESTAMPTZ",
        "ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS calendar_events JSONB",
        "ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS calendar_events JSONB",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
