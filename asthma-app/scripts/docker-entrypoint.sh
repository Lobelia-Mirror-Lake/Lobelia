#!/usr/bin/env sh
set -eu

cd /app

python scripts/wait_for_db.py
python scripts/init_db.py

exec "$@"
