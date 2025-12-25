#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:11436"
IMG="./frontend/public/images/hexforge-logo.png"

echo "[test] posting to $BASE/tool/heightmap"
curl -sS -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE/tool/heightmap" \
  -F "image=@${IMG}" \
  -F "name=hexforge" \
  -F "size_mm=80" \
  -F "thickness=2" \
  -F "max_height=4" \
  -F "invert=true" \
  -o /tmp/heightmap_resp.json

echo "[test] response saved to /tmp/heightmap_resp.json"
head -n 40 /tmp/heightmap_resp.json

echo "[test] verify manifest exists inside container"
docker exec -it hexforge-assistant bash -lc 'ls -lah /data/hexforge3d/output | grep -i manifest || true'
