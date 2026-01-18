#!/usr/bin/env bash
set -euo pipefail

# Smoke: heightmap -> surface using nginx endpoints
# Requirements: curl, jq, HEIGHTMAP_IMAGE=/path/to/input.png
# Optional: OUTPUT_SUBFOLDER=your/subfolder (default: smoke-test)

BASE_URL="${BASE_URL:-https://localhost}"
HMAP_KEY_HEADER=${HEIGHTMAP_API_KEY:+-H "x-api-key: ${HEIGHTMAP_API_KEY}"}
SURF_KEY_HEADER=${SURFACE_API_KEY:+-H "x-api-key: ${SURFACE_API_KEY}"}
IMAGE_PATH="${HEIGHTMAP_IMAGE:-}"
OUTPUT_SUBFOLDER="${OUTPUT_SUBFOLDER:-smoke-test}"

if [[ -z "${IMAGE_PATH}" ]]; then
  echo "HEIGHTMAP_IMAGE is required" >&2
  exit 1
fi
if [[ ! -f "${IMAGE_PATH}" ]]; then
  echo "HEIGHTMAP_IMAGE not found: ${IMAGE_PATH}" >&2
  exit 1
fi

log() { printf "[%s] %s\n" "$(date -u +%H:%M:%S)" "$*" >&2; }

req() {
  # shellcheck disable=SC2086
  curl -sk ${1} "${2}" -w "\n" -o /tmp/smoke_resp.json
  cat /tmp/smoke_resp.json
}

poll_heightmap() {
  local status_url="$1"
  local abs_status_url="$status_url"

  # Support relative status URLs from the API response
  if [[ "$abs_status_url" == /* ]]; then
    abs_status_url="${BASE_URL}${abs_status_url}"
  fi

  for i in {1..120}; do
    # shellcheck disable=SC2086
    curl -sk ${HMAP_KEY_HEADER} "${abs_status_url}" -o /tmp/hm_status.json
    local ok=$(jq -r '.ok // false' /tmp/hm_status.json 2>/dev/null || echo "false")
    local st=$(jq -r '.job.status // .status // ""' /tmp/hm_status.json 2>/dev/null || echo "")
    log "heightmap status=${st}"
    if [[ "${ok}" == "true" && "${st}" == "done" ]]; then
      cat /tmp/hm_status.json
      return 0
    fi
    sleep 3
  done
  echo "Heightmap timed out" >&2
  return 1
}

poll_surface() {
  local job_id="$1"
  local abs_status_url="${BASE_URL}/api/surface/jobs/${job_id}"
  for i in {1..80}; do
    # shellcheck disable=SC2086
    curl -sk ${SURF_KEY_HEADER} "${abs_status_url}" -o /tmp/sf_status.json
    local st=$(jq -r '.status // ""' /tmp/sf_status.json 2>/dev/null || echo "")
    log "surface status=${st}"
    if [[ "${st}" == "complete" ]]; then
      cat /tmp/sf_status.json
      return 0
    fi
    sleep 3
  done
  echo "Surface timed out" >&2
  return 1
}

log "Submitting heightmap job"
# shellcheck disable=SC2086
curl -sk -X POST ${HMAP_KEY_HEADER} \
  -F "image=@${IMAGE_PATH}" \
  -F "name=smoke-hmap-$(date -u +%s)" \
  "${BASE_URL}/api/heightmap/v1" -o /tmp/hm_create.json

HMAP_JOB_ID=$(jq -r '.job_id // empty' /tmp/hm_create.json)
STATUS_URL=$(jq -r '.status_url // empty' /tmp/hm_create.json)
if [[ -z "${STATUS_URL}" ]]; then
  STATUS_URL="${BASE_URL}/api/heightmap/jobs/${HMAP_JOB_ID}"
fi
log "Heightmap job id=${HMAP_JOB_ID}"

poll_heightmap "${STATUS_URL}" >/tmp/hm_done.json
HMAP_URL=$(jq -r '.job.result.public.heightmap_url // empty' /tmp/hm_done.json)
if [[ -z "${HMAP_URL}" ]]; then
  echo "No heightmap_url in response" >&2
  exit 1
fi
log "Heightmap URL=${HMAP_URL}"

log "Submitting surface job"
cat > /tmp/sf_payload.json <<EOF
{ "name": "smoke-surface-$(date -u +%s)",
  "quality": "standard",
  "mode": "relief",
  "subfolder": "${OUTPUT_SUBFOLDER}",
  "source_heightmap_url": "${HMAP_URL}",
  "source_heightmap_job_id": "${HMAP_JOB_ID}" }
EOF

# shellcheck disable=SC2086
curl -sk -X POST ${SURF_KEY_HEADER} -H "Content-Type: application/json" \
  -d @/tmp/sf_payload.json "${BASE_URL}/api/surface/jobs" -o /tmp/sf_create.json
SF_JOB_ID=$(jq -r '.job_id // empty' /tmp/sf_create.json)
log "Surface job id=${SF_JOB_ID}"

poll_surface "${SF_JOB_ID}" >/tmp/sf_done.json
MANIFEST_URL=$(jq -r '.result.job_manifest // .result.public.job_manifest' /tmp/sf_done.json)
log "Surface manifest=${MANIFEST_URL}"

# shellcheck disable=SC2086
curl -skI "${BASE_URL}${MANIFEST_URL}" | head -n1 >&2
log "Smoke complete"

# CI-friendly summary to stdout (keep logs on stderr)
ABS_MANIFEST="${MANIFEST_URL}"
if [[ "${ABS_MANIFEST}" == /* ]]; then
  ABS_MANIFEST="${BASE_URL}${ABS_MANIFEST}"
fi
ABS_HMAP="${HMAP_URL}"
if [[ "${ABS_HMAP}" == /* ]]; then
  ABS_HMAP="${BASE_URL}${ABS_HMAP}"
fi

printf '{"heightmap_job_id":"%s","heightmap_url":"%s","surface_job_id":"%s","manifest_url":"%s","subfolder":"%s"}\n' \
  "${HMAP_JOB_ID}" "${ABS_HMAP}" "${SF_JOB_ID}" "${ABS_MANIFEST}" "${OUTPUT_SUBFOLDER}"
