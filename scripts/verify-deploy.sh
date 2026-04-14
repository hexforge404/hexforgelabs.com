#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
BASE_URL="${BASE_URL:-http://127.0.0.1:8088}"

printf "🔎 Checking backend version endpoint...\n"
curl -fsS "$BASE_URL/api/version" | python3 -c 'import sys, json; obj=json.load(sys.stdin); print(obj)' || exit 1

printf "🔎 Checking backend health endpoint...\n"
curl -fsS "$BASE_URL/api/health" | python3 -c 'import sys, json; obj=json.load(sys.stdin); print(obj)' || exit 1

printf "🔎 Checking frontend root route and cache headers...\n"
INDEX_HEADERS=$(curl -fsSI "$BASE_URL/")
printf "%s\n" "$INDEX_HEADERS" | grep -i '^cache-control:' | head -1
printf "\n"

printf "🔎 Checking SPA fallback for /store/...\n"
if curl -fsSL "$BASE_URL/store/" | grep -qi '<!doctype html>'; then
  printf "✅ SPA route fallback returns HTML.\n"
else
  printf "❌ SPA route fallback failed.\n"
  exit 1
fi

printf "🔎 Checking success page route for HTML shell...\n"
if curl -fsSL "$BASE_URL/custom-order-success?orderId=test&sessionId=test" | grep -qi '<!doctype html>'; then
  printf "✅ Success page route returns HTML shell.\n"
else
  printf "❌ Success page route failed.\n"
  exit 1
fi

printf "✅ Verification passed. Use BASE_URL=<url> ./scripts/verify-deploy.sh for remote targets.\n"
