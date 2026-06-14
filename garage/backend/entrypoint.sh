#!/usr/bin/env sh
set -e

# Optionally seed the database on startup (idempotent for seeded rows).
# Controlled by SEED_ON_START env var (set in docker-compose).
if [ "${SEED_ON_START}" = "true" ]; then
  echo "Seeding database..."
  python seed.py || echo "Seed step failed; continuing to start the API."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
