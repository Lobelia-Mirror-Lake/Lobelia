"""Create PostgreSQL tables for Mirror Lake product APIs."""

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from db.database import init_db

if __name__ == "__main__":
    init_db()
    print("Database tables created (or already exist).")
