"""add calendar and setup wizard columns

Adds Google Calendar OAuth fields plus setup-wizard profile fields that the
models and API already expect but the initial migration predates.

Revision ID: b7f3a1c9d2e4
Revises: 36c402e69a90
Create Date: 2026-07-24 18:25:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b7f3a1c9d2e4"
down_revision: Union[str, Sequence[str], None] = "36c402e69a90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "emergency_contacts",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=True,
        ),
    )
    op.add_column("users", sa.Column("symptoms", postgresql.ARRAY(sa.Text()), nullable=True))
    op.add_column("users", sa.Column("tracking", postgresql.ARRAY(sa.Text()), nullable=True))
    op.add_column("users", sa.Column("google_calendar_refresh_token", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("google_calendar_email", sa.String(length=255), nullable=True))
    op.add_column(
        "users",
        sa.Column("google_calendar_connected_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "check_ins",
        sa.Column("calendar_events", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "forecasts",
        sa.Column("calendar_events", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("forecasts", "calendar_events")
    op.drop_column("check_ins", "calendar_events")
    op.drop_column("users", "google_calendar_connected_at")
    op.drop_column("users", "google_calendar_email")
    op.drop_column("users", "google_calendar_refresh_token")
    op.drop_column("users", "tracking")
    op.drop_column("users", "symptoms")
    op.drop_column("users", "emergency_contacts")
