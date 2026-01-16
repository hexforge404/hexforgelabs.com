#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "[backend] running tests in docker..."
docker compose run --rm backend npm test

echo "[frontend] checking dependencies..."
if [ -d "$ROOT_DIR/frontend/node_modules" ]; then
  (cd "$ROOT_DIR/frontend" && npm test -- --watchAll=false)
else
  echo "[frontend] skipped (frontend/node_modules not found; run npm install first if you want frontend tests)."
fi
