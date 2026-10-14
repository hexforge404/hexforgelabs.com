#!/usr/bin/env bash
set -uo pipefail

# HexForge Labs production health check
# Diagnostic only: no restarts, deployments, or data writes.

FAILURES=0

pass() {
  printf 'PASS: %s\n' "$1"
}

fail() {
  printf 'FAIL: %s\n' "$1"
  FAILURES=$((FAILURES + 1))
}

echo "=== HEXFORGE PRODUCTION HEALTH CHECK ==="

echo
echo "=== DOCKER CONTAINER HEALTH ==="

for container in hexforge-backend hexforge-nginx; do
  status="$(
    docker inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' \
      "$container" 2>/dev/null
  )" || status="unavailable"

  if [ "$status" = "healthy" ]; then
    pass "$container healthy"
  else
    fail "$container status: $status"
  fi
done

echo
echo "=== BACKEND AND DATABASE ==="

if response="$(
  docker exec hexforge-backend \
    curl -fsS --max-time 10 \
    http://127.0.0.1:8000/health 2>/dev/null
)"; then

  if printf '%s' "$response" | python3 -c '
import json
import sys

try:
    data = json.load(sys.stdin)
except (ValueError, TypeError):
    sys.exit(1)

if (
    data.get("status") == "healthy"
    and data.get("dbStatus") == "connected"
):
    sys.exit(0)

sys.exit(1)
'; then
    pass "Backend healthy; MongoDB connected"
  else
    fail "Backend health response invalid or unhealthy"
  fi
else
  fail "Backend health endpoint unavailable"
fi

echo
echo "=== PUBLIC HTTPS ENDPOINTS ==="

for path in / /api/products /admin; do
  if code="$(
    curl -sS -o /dev/null \
      --connect-timeout 5 \
      --max-time 10 \
      -w '%{http_code}' \
      "https://hexforgelabs.com$path" 2>/dev/null
  )"; then

    if [ "$code" = "200" ]; then
      pass "$path HTTP 200"
    else
      fail "$path HTTP $code"
    fi
  else
    fail "$path request failed"
  fi
done

echo
echo "=== BACKEND PORT ISOLATION ==="

if ports="$(docker port hexforge-backend 2>/dev/null)"; then
  if [ -z "$ports" ]; then
    pass "Backend has no published host ports"
  else
    fail "Backend has published host ports"
  fi
else
  fail "Unable to inspect backend port mappings"
fi

echo
echo "=== FINAL RESULT ==="

if [ "$FAILURES" -eq 0 ]; then
  echo "PASS: All production health checks passed"
  exit 0
else
  echo "FAIL: $FAILURES health check(s) failed"
  exit 1
fi
