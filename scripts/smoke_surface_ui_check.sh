#!/usr/bin/env bash
set -euo pipefail

# Lightweight UI-facing smoke: hit proxy status + manifest and verify assets resolve.
# Usage: SURFACE_SMOKE_BASE_URL=https://localhost SURFACE_DEFAULT_SUBFOLDER=smoke-test ./scripts/smoke_surface_ui_check.sh <job_id>

BASE_URL=${SURFACE_SMOKE_BASE_URL:-https://localhost}
JOB_ID=${1:-}
SUBFOLDER=${SURFACE_DEFAULT_SUBFOLDER:-smoke-test}
API_KEY_HEADER=${SURFACE_API_KEY:+-H "x-api-key: ${SURFACE_API_KEY}"}

if [[ -z "${JOB_ID}" ]]; then
  echo "job_id is required" >&2
  exit 64
fi

log() { printf "[%s] %s\n" "$(date -u +%H:%M:%S)" "$*" >&2; }

head_check() {
  local url=$1
  local abs="$url"
  [[ "$abs" == /* ]] && abs="${BASE_URL}${abs}"
  local status
  status=$(curl -skI ${API_KEY_HEADER} "$abs" -o /tmp/sf_ui_head.txt -w "%{http_code}")
  local cl
  cl=$(grep -i "content-length" /tmp/sf_ui_head.txt | tail -n1 | awk '{print $2}' | tr -d '\r')
  [[ -z "$cl" ]] && cl=1
  if [[ "$status" != "200" || "$cl" -le 0 ]]; then
    log "Asset check failed: ${abs} status=${status} len=${cl}"
    return 1
  fi
  return 0
}

log "Fetching status for job ${JOB_ID}"
curl -sk ${API_KEY_HEADER} "${BASE_URL}/api/store/surface/jobs/${JOB_ID}?subfolder=${SUBFOLDER}" -o /tmp/sf_ui_status.json
cat /tmp/sf_ui_status.json

manifest_url=$(jq -r '.manifest_url // .result.job_manifest // .result.public.job_manifest // empty' /tmp/sf_ui_status.json)
state=$(jq -r '.state // .status // ""' /tmp/sf_ui_status.json)
if [[ -z "$manifest_url" ]]; then
  log "No manifest_url in status"; exit 1; fi

log "Fetching manifest ${manifest_url}"
abs_manifest="$manifest_url"
[[ "$abs_manifest" == /* ]] && abs_manifest="${BASE_URL}${abs_manifest}"
curl -sk ${API_KEY_HEADER} "$abs_manifest" -o /tmp/sf_ui_manifest.json
cat /tmp/sf_ui_manifest.json

hero=$(jq -r '.outputs[] | select((.type//""|test("preview";"i"))) | .url // .public_url // empty' /tmp/sf_ui_manifest.json | head -n1)
stl=$(jq -r '.outputs[] | select((.type//""|test("stl";"i"))) | .url // .public_url // empty' /tmp/sf_ui_manifest.json | head -n1)

[[ -z "$hero" || -z "$stl" ]] && { log "Manifest missing hero or stl"; exit 1; }
head_check "$hero"
head_check "$stl"

printf '{"job_id":"%s","state":"%s","manifest_url":"%s","hero":"%s","stl":"%s","subfolder":"%s"}\n' \
  "$JOB_ID" "$state" "$manifest_url" "$hero" "$stl" "$SUBFOLDER"
log "UI status + manifest OK"
