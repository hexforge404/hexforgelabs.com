#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

BUILD_ID="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
BUILD_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

export BUILD_ID
export BUILD_TIMESTAMP

printf "📦 Deploying HexForge build %s (%s)\n" "$BUILD_ID" "$BUILD_TIMESTAMP"

printf "🧼 Stopping existing containers...\n"
docker compose down

printf "🐳 Rebuilding services without cache...\n"
docker compose build --no-cache --build-arg BUILD_ID="$BUILD_ID" --build-arg BUILD_TIMESTAMP="$BUILD_TIMESTAMP" nginx backend

printf "🚀 Starting fresh container set...\n"
docker compose up -d

printf "🔎 Current compose status:\n"
docker compose ps

printf "✅ Deploy complete. Verify with ./scripts/verify-deploy.sh or curl /api/version\n"
