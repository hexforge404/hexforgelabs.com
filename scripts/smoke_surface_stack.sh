#!/usr/bin/env bash
set -euo pipefail

# End-to-end surface stack smoke test.
# Requires an existing heightmap asset URL (public) produced by the Heightmap pipeline.
# Usage: SURFACE_SMOKE_BASE_URL=https://localhost SURFACE_HEIGHTMAP_URL=/assets/heightmap/demo.png ./scripts/smoke_surface_stack.sh

BASE_URL=${SURFACE_SMOKE_BASE_URL:-https://localhost}
HEIGHTMAP_URL=${SURFACE_HEIGHTMAP_URL:-}
SUBFOLDER=${SURFACE_DEFAULT_SUBFOLDER:-smoke-test}
API_KEY_HEADER=${SURFACE_API_KEY:+-H "x-api-key: ${SURFACE_API_KEY}"}
POLL_SECONDS=120
SLEEP_SECONDS=3

if [[ -z "${HEIGHTMAP_URL}" ]]; then
  echo "SURFACE_HEIGHTMAP_URL is required (public URL to a heightmap png)." >&2
  exit 64
fi

log() { printf "[%s] %s\n" "$(date -u +%H:%M:%S)" "$*" >&2; }

create_job() {
  log "Submitting surface job"
  local payload
  payload=$(cat <<EOF
{ "name": "smoke-surface-$(date -u +%s)",
  "quality": "standard",
  "mode": "relief",
  "subfolder": "${SUBFOLDER}",
  "source_heightmap_url": "${HEIGHTMAP_URL}" }
EOF
)
  # shellcheck disable=SC2086
  curl -sk -X POST ${API_KEY_HEADER} -H "Content-Type: application/json" \
    -d "${payload}" "${BASE_URL}/api/store/surface/jobs" -o /tmp/sf_job_create.json
  cat /tmp/sf_job_create.json
  jq -er '.job_id' /tmp/sf_job_create.json
}

poll_job() {
  local job_id=$1
  for i in $(seq 1 $((POLL_SECONDS / SLEEP_SECONDS))); do
    # shellcheck disable=SC2086
    curl -sk ${API_KEY_HEADER} "${BASE_URL}/api/store/surface/jobs/${job_id}?subfolder=${SUBFOLDER}" -o /tmp/sf_status.json
    local ok status
    ok=$(jq -r '.ok // true' /tmp/sf_status.json 2>/dev/null || echo "true")
    status=$(jq -r '.status // .job.status // ""' /tmp/sf_status.json 2>/dev/null || echo "")
    log "status=${status} ok=${ok}"
    if [[ "${ok}" != "true" ]]; then
      log "Error body:"; cat /tmp/sf_status.json >&2; return 1
    fi
    if [[ "${status}" == "complete" ]]; then
      return 0
    fi
    if [[ "${status}" == "failed" ]]; then
      log "Job failed:"; cat /tmp/sf_status.json >&2; return 1
    fi
    sleep ${SLEEP_SECONDS}
  done
  log "Timed out waiting for job ${job_id}"; return 1
}

fetch_manifest() {
  local job_id=$1
  local manifest_url
  manifest_url=$(jq -r '.manifest_url // .manifest.manifest_url // .result.public.job_manifest // empty' /tmp/sf_status.json || true)
  if [[ -z "${manifest_url}" ]]; then
    log "manifest_url missing in status"; return 1
  fi
  if [[ "${manifest_url}" == /* ]]; then
    manifest_url="${BASE_URL}${manifest_url}"
  fi
  log "Fetching manifest ${manifest_url}"
  curl -sk ${API_KEY_HEADER} "${manifest_url}" -o /tmp/sf_manifest.json
  cat /tmp/sf_manifest.json
  jq -e '.outputs | length > 0' /tmp/sf_manifest.json >/dev/null
  echo "${manifest_url}" > /tmp/sf_manifest_url.txt
}

validate_outputs() {
  local preview stl manifest_url
  preview=$(jq -r '.outputs[] | select((.type // "")|test("preview";"i")) | .url // .public_url // empty' /tmp/sf_manifest.json | head -n1)
  stl=$(jq -r '.outputs[] | select((.type // "")|test("stl";"i")) | .url // .public_url // empty' /tmp/sf_manifest.json | head -n1)
  manifest_url=$(cat /tmp/sf_manifest_url.txt)

  [[ -n "${preview}" ]] || { log "Missing preview output"; return 1; }
  [[ -n "${stl}" ]] || { log "Missing STL output"; return 1; }

  for url in "${preview}" "${stl}"; do
    local abs="$url"
    [[ "${abs}" == /* ]] && abs="${BASE_URL}${abs}"
    log "HEAD ${abs}"
    http_code=$(curl -skI "${abs}" -o /dev/null -w "%{http_code}")
    if [[ "${http_code}" != "200" ]]; then
      log "Asset fetch failed (${http_code}) for ${abs}"; return 1
    fi
  done

  printf '{"job_id":"%s","manifest_url":"%s","preview":"%s","stl":"%s","subfolder":"%s"}\n' \
    "${JOB_ID}" "${manifest_url}" "${preview}" "${stl}" "${SUBFOLDER}"
}

JOB_ID=$(create_job)
poll_job "${JOB_ID}"
fetch_manifest "${JOB_ID}"
validate_outputs
log "Surface smoke PASS"
