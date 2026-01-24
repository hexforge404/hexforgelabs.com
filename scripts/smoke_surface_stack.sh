#!/usr/bin/env bash
set -euo pipefail

# End-to-end surface stack smoke test.
# Requires an existing heightmap asset URL (public) produced by the Heightmap pipeline.
# Usage: SURFACE_SMOKE_BASE_URL=https://localhost SURFACE_HEIGHTMAP_URL=/assets/heightmap/demo.png ./scripts/smoke_surface_stack.sh

if [[ -n "${BASE_URL:-}" ]]; then
  BASE_URL="${BASE_URL}"
  BASE_URL_SOURCE="BASE_URL"
elif [[ -n "${SURFACE_SMOKE_BASE_URL:-}" ]]; then
  BASE_URL="${SURFACE_SMOKE_BASE_URL}"
  BASE_URL_SOURCE="SURFACE_SMOKE_BASE_URL"
elif [[ -n "${SURFACE_BASE_URL:-}" ]]; then
  BASE_URL="${SURFACE_BASE_URL}"
  BASE_URL_SOURCE="SURFACE_BASE_URL"
else
  BASE_URL="https://localhost"
  BASE_URL_SOURCE="default"
fi
if [[ -n "${HEIGHTMAP_URL:-}" ]]; then
  HEIGHTMAP_URL="${HEIGHTMAP_URL}"
  HEIGHTMAP_URL_SOURCE="HEIGHTMAP_URL"
elif [[ -n "${SURFACE_HEIGHTMAP_URL:-}" ]]; then
  HEIGHTMAP_URL="${SURFACE_HEIGHTMAP_URL}"
  HEIGHTMAP_URL_SOURCE="SURFACE_HEIGHTMAP_URL"
else
  HEIGHTMAP_URL=""
  HEIGHTMAP_URL_SOURCE="unset"
fi
SUBFOLDER=${SURFACE_DEFAULT_SUBFOLDER:-smoke-test}
API_KEY_HEADER=${SURFACE_API_KEY:+-H "x-api-key: ${SURFACE_API_KEY}"}
POLL_SECONDS=120
SLEEP_SECONDS=3

CURL_FLAGS=(-sS)
if [[ "${CURL_INSECURE:-0}" == "1" ]]; then
  CURL_FLAGS+=(-k)
fi

log() { printf "[%s] %s\n" "$(date -u +%H:%M:%S)" "$*" >&2; }
log "BASE_URL: ${BASE_URL} (source: ${BASE_URL_SOURCE})"
log "HEIGHTMAP_URL source: ${HEIGHTMAP_URL_SOURCE}"

maybe_upgrade_base() {
  if [[ "${BASE_URL}" =~ ^https:// ]]; then
    return
  fi
  local probe_hdr
  probe_hdr=$(mktemp)
  local status
  status=$(curl "${CURL_FLAGS[@]}" -I "${BASE_URL}" -o /dev/null -D "${probe_hdr}" -w "%{http_code}")
  local location
  location=$(grep -i "^location:" "${probe_hdr}" | tail -n1 | awk '{print $2}' | tr -d '\r')
  if [[ "${status}" =~ ^30[12]$ && "${location}" =~ ^https:// ]]; then
    log "Detected HTTP→HTTPS redirect. Switching BASE_URL to ${location}"
    BASE_URL="${location%/}"
  fi
  rm -f "${probe_hdr}"
}

curl_json() {
  local url="$1"; shift
  local body hdr status ct effective
  body=$(mktemp)
  hdr=$(mktemp)
  status=$(curl "${CURL_FLAGS[@]}" -D "${hdr}" -o "${body}" -w "%{http_code}" "$@" "$url")
  effective=$(grep -i "^location:" "${hdr}" | tail -n1 | awk '{print $2}' | tr -d '\r')
  [[ -z "${effective}" ]] && effective="$url"
  ct=$(grep -i "^content-type:" "${hdr}" | tail -n1 | cut -d: -f2- | tr -d ' \r\n' | tr 'A-Z' 'a-z')
  if [[ "${status}" =~ ^30[12]$ ]]; then
    echo "Redirect (${status}) to ${effective}" >&2
  fi
  if [[ ! "${status}" =~ ^2 ]]; then
    echo "HTTP ${status} from ${effective} (expected JSON)" >&2
    head -n 20 "${body}" >&2
    rm -f "${body}" "${hdr}"; return 1
  fi
  if [[ "${ct}" != *json* ]]; then
    echo "Expected application/json from ${effective}, got '${ct}'" >&2
    head -n 20 "${body}" >&2
    rm -f "${body}" "${hdr}"; return 1
  fi
  cat "${body}"
  rm -f "${body}" "${hdr}"
}

curl_head_ok() {
  local url="$1"; shift
  local hdr status cl
  hdr=$(mktemp)
  status=$(curl "${CURL_FLAGS[@]}" -I "$@" "$url" -D "${hdr}" -o /dev/null -w "%{http_code}")
  cl=$(grep -i "content-length" "${hdr}" | tail -n1 | awk '{print $2}' | tr -d '\r')
  [[ -z "${cl}" ]] && cl=0
  rm -f "${hdr}"
  if [[ ! "${status}" =~ ^2 ]]; then
    echo "HEAD ${url} failed status=${status} len=${cl}" >&2; return 1
  fi
  if [[ "${cl}" -le 0 ]]; then
    echo "HEAD ${url} returned zero content-length" >&2; return 1
  fi
  echo "${cl}"
}

if [[ -z "${HEIGHTMAP_URL}" ]]; then
  echo "SURFACE_HEIGHTMAP_URL is required (public URL to a heightmap png)." >&2
  exit 64
fi

maybe_upgrade_base

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
  local resp
  resp=$(curl_json "${BASE_URL}/api/store/surface/jobs" ${API_KEY_HEADER} -H "Content-Type: application/json" -d "${payload}")
  echo "${resp}" >&2
  printf "%s" "${resp}" | jq -er '.job_id'
}

poll_job() {
  local job_id=$1
  for i in $(seq 1 $((POLL_SECONDS / SLEEP_SECONDS))); do
    local status_json
    status_json=$(curl_json "${BASE_URL}/api/store/surface/jobs/${job_id}?subfolder=${SUBFOLDER}" ${API_KEY_HEADER}) || return 1
    printf "%s" "${status_json}" > /tmp/sf_status.json
    local ok status
    ok=$(printf "%s" "${status_json}" | jq -r '.ok // true' 2>/dev/null || echo "true")
    status=$(printf "%s" "${status_json}" | jq -r '.status // .job.status // ""' 2>/dev/null || echo "")
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
  local manifest_json
  manifest_json=$(curl_json "${manifest_url}" ${API_KEY_HEADER}) || return 1
  printf "%s" "${manifest_json}" > /tmp/sf_manifest.json
  printf "%s" "${manifest_json}"
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
    local len
    len=$(curl_head_ok "${abs}" ${API_KEY_HEADER}) || return 1
    printf "length(%s)=%s\n" "${abs}" "${len}"
  done

  printf '{"job_id":"%s","manifest_url":"%s","preview":"%s","stl":"%s","subfolder":"%s"}\n' \
    "${JOB_ID}" "${manifest_url}" "${preview}" "${stl}" "${SUBFOLDER}"
}

JOB_ID=$(create_job)
poll_job "${JOB_ID}"
fetch_manifest "${JOB_ID}"
validate_outputs
log "Surface smoke PASS"
echo "✅ PASS: smoke_surface_stack.sh"
