#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE:-https://localhost}
API="$BASE/api/heightmap"

echo "[heightmap] creating job..."
create_resp=$(curl -sk -X POST "$API/jobs" \
  -H "Content-Type: application/json" \
  -d '{"name":"smoke-heightmap"}')

echo "$create_resp"
job_id=$(python3 - <<'PY'
import json,sys
try:
    data=json.load(sys.stdin)
    print(data.get("job_id") or "")
except Exception:
    print("")
PY <<<"$create_resp")

if [ -z "$job_id" ]; then
  echo "[heightmap] failed to get job_id" >&2
  exit 1
fi

tries=0
status="queued"
while [ $tries -lt 20 ]; do
  status_resp=$(curl -sk "$API/jobs/$job_id")
  status=$(python3 - <<'PY'
import json,sys
try:
    data=json.load(sys.stdin)
    print(data.get("status",""))
except Exception:
    print("")
PY <<<"$status_resp")
  echo "[heightmap] status: $status"
  if [ "$status" = "complete" ]; then
    break
  fi
  if [ "$status" = "failed" ]; then
    echo "$status_resp"
    exit 1
  fi
  sleep 1
  tries=$((tries+1))
done

if [ "$status" != "complete" ]; then
  echo "[heightmap] job did not complete in time" >&2
  exit 1
fi

echo "[heightmap] fetching assets..."
assets_resp=$(curl -sk "$API/jobs/$job_id/assets")
echo "$assets_resp"

if echo "$assets_resp" | grep -q '/assets/heightmap/'; then
  echo "[heightmap] assets paths look good"
else
  echo "[heightmap] assets paths missing /assets/heightmap/ prefix" >&2
  exit 1
fi
