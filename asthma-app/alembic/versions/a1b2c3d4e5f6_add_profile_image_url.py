"""Add users.profile_image_url for Cloudinary (or other CDN) avatars.

Revision ID: a1b2c3d4e5f6
Revises: 36c402e69a90
Create Date: 2026-07-24 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "36c402e69a90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_image_url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_image_url")
