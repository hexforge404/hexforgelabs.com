#!/usr/bin/env bash
set -euo pipefail

# End-to-end proof that Surface consumes the requested heightmap URL and produces usable assets.
# Usage:
#   SURFACE_BASE_URL=https://localhost \
#   HEIGHTMAP_URL=/assets/heightmap/demo.png \
#   ./scripts/e2e_surface_proof.sh
#
# Optional:
#   HEIGHTMAP_JOB_ID=<id>     # fetches heightmap URL from the heightmap API
#   SURFACE_API_KEY=...       # forwarded to surface proxy
#   HEIGHTMAP_API_KEY=...     # forwarded to heightmap API
#   SURFACE_DEFAULT_SUBFOLDER=proof-run

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
SUBFOLDER=${SURFACE_DEFAULT_SUBFOLDER:-proof-run}
HEIGHTMAP_URL=${HEIGHTMAP_URL:-}
HEIGHTMAP_JOB_ID=${HEIGHTMAP_JOB_ID:-}
HEIGHTMAP_API_BASE=${HEIGHTMAP_API_BASE:-${BASE_URL}/api/heightmap}
SURFACE_API=${BASE_URL}/api/store/surface
API_KEY_HEADER=${SURFACE_API_KEY:+-H "x-api-key: ${SURFACE_API_KEY}"}
HEIGHTMAP_API_KEY_HEADER=${HEIGHTMAP_API_KEY:+-H "x-api-key: ${HEIGHTMAP_API_KEY}"}
POLL_SECONDS=240
SLEEP_SECONDS=4

CURL_FLAGS=(-sS)
if [[ "${CURL_INSECURE:-0}" == "1" ]]; then
  CURL_FLAGS+=(-k)
fi

log() { printf "[%s] %s\n" "$(date -u +%H:%M:%S)" "$*" >&2; }
log "BASE_URL: ${BASE_URL} (source: ${BASE_URL_SOURCE})"

maybe_upgrade_base() {
  if [[ "${BASE_URL}" =~ ^https:// ]]; then return; fi
  local hdr status location
  hdr=$(mktemp)
  status=$(curl "${CURL_FLAGS[@]}" -I "${BASE_URL}" -o /dev/null -D "${hdr}" -w "%{http_code}")
  location=$(grep -i "^location:" "${hdr}" | tail -n1 | awk '{print $2}' | tr -d '\r')
  if [[ "${status}" =~ ^30[12]$ && "${location}" =~ ^https:// ]]; then
    log "Detected HTTP→HTTPS redirect. Switching BASE_URL to ${location}"
    BASE_URL="${location%/}"
    SURFACE_API="${BASE_URL}/api/store/surface"
    HEIGHTMAP_API_BASE=${HEIGHTMAP_API_BASE/"http://"/"https://"}
  fi
  rm -f "${hdr}"
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

need_heightmap_url() {
  if [[ -n "${HEIGHTMAP_URL}" ]]; then
    return 0
  fi
  if [[ -z "${HEIGHTMAP_JOB_ID}" ]]; then
    log "Provide HEIGHTMAP_URL or HEIGHTMAP_JOB_ID"; exit 64
  fi
  log "Fetching heightmap job ${HEIGHTMAP_JOB_ID} from ${HEIGHTMAP_API_BASE}"
  # shellcheck disable=SC2086
  curl -sk ${HEIGHTMAP_API_KEY_HEADER} "${HEIGHTMAP_API_BASE}/v1/jobs/${HEIGHTMAP_JOB_ID}" -o /tmp/e2e_heightmap.json
  HEIGHTMAP_URL=$(jq -r '.result.public.heightmap_url // .public.heightmap_url // empty' /tmp/e2e_heightmap.json)
  if [[ -z "${HEIGHTMAP_URL}" ]]; then
    log "Heightmap URL missing in job payload"; exit 1
  fi
}

create_surface_job() {
  local payload
  payload=$(cat <<EOF
{ "name": "e2e-surface-$(date -u +%s)",
  "quality": "standard",
  "mode": "relief",
  "subfolder": "${SUBFOLDER}",
  "source_heightmap_url": "${HEIGHTMAP_URL}",
  "source_heightmap_job_id": "${HEIGHTMAP_JOB_ID}" }
EOF
)
  log "Submitting surface job with heightmap ${HEIGHTMAP_URL}"
  # shellcheck disable=SC2086
  curl -sk -X POST ${API_KEY_HEADER} -H "Content-Type: application/json" \
    -d "${payload}" "${SURFACE_API}/jobs" -o /tmp/e2e_surface_create.json
  cat /tmp/e2e_surface_create.json >&2
  JOB_ID=$(jq -er '.job_id' /tmp/e2e_surface_create.json)
}

poll_surface_job() {
  for i in $(seq 1 $((POLL_SECONDS / SLEEP_SECONDS))); do
    # shellcheck disable=SC2086
    curl -sk ${API_KEY_HEADER} "${SURFACE_API}/jobs/${JOB_ID}?subfolder=${SUBFOLDER}" -o /tmp/e2e_surface_status.json
    local state ok
    state=$(jq -r '.state // .status // .job.state // ""' /tmp/e2e_surface_status.json)
    ok=$(jq -r '.ok // true' /tmp/e2e_surface_status.json 2>/dev/null || echo "true")
    log "state=${state} ok=${ok}"
    if [[ "${ok}" != "true" ]]; then
      log "Status error:"; cat /tmp/e2e_surface_status.json >&2; exit 1
    fi
    if [[ "${state}" == "complete" ]]; then
      return 0
    fi
    if [[ "${state}" == "failed" ]]; then
      log "Job failed:"; cat /tmp/e2e_surface_status.json >&2; exit 1
    fi
    sleep ${SLEEP_SECONDS}
  done
  log "Timed out waiting for job ${JOB_ID}"; exit 1
}

fetch_manifest() {
  MANIFEST_URL=$(jq -r '.manifest_url // .manifest.manifest_url // .result.public.job_manifest // .job.manifest_url // empty' /tmp/e2e_surface_status.json)
  if [[ -z "${MANIFEST_URL}" ]]; then
    log "manifest_url missing in status"; exit 1
  fi
  [[ "${MANIFEST_URL}" == /* ]] && MANIFEST_URL="${BASE_URL}${MANIFEST_URL}"
  log "Fetching manifest ${MANIFEST_URL}"
  # shellcheck disable=SC2086
  curl -sk ${API_KEY_HEADER} "${MANIFEST_URL}" -o /tmp/e2e_surface_manifest.json
  cat /tmp/e2e_surface_manifest.json >&2
  jq -e '.outputs | length > 0' /tmp/e2e_surface_manifest.json >/dev/null
}

head_nonzero() {
  local url=$1
  local abs="$url"
  [[ "$abs" == /* ]] && abs="${BASE_URL}${abs}"
  # shellcheck disable=SC2086
  local status
  status=$(curl -skI ${API_KEY_HEADER} "$abs" -o /tmp/e2e_head.txt -w "%{http_code}")
  local cl
  cl=$(grep -i "content-length" /tmp/e2e_head.txt | tail -n1 | awk '{print $2}' | tr -d '\r')
  [[ -z "$cl" ]] && cl=1
  if [[ "$status" != "200" || "$cl" -le 0 ]]; then
    log "Asset invalid: ${abs} status=${status} len=${cl}"; exit 1
  fi
}

validate_manifest() {
  HERO=$(jq -r '.outputs[] | select((.type//""|test("preview|hero";"i"))) | .url // .public_url // empty' /tmp/e2e_surface_manifest.json | head -n1)
  STL=$(jq -r '.outputs[] | select((.type//""|test("stl";"i"))) | .url // .public_url // empty' /tmp/e2e_surface_manifest.json | head -n1)
  HEIGHTMAP_OUTPUT=$(jq -r '.outputs[] | select((.type//""|test("heightmap|texture";"i")) or (.name//""|test("heightmap";"i"))) | .url // .public_url // empty' /tmp/e2e_surface_manifest.json | head -n1)

  [[ -n "${HERO}" ]] || { log "Missing hero/preview output"; exit 1; }
  [[ -n "${STL}" ]] || { log "Missing STL output"; exit 1; }

  head_nonzero "${HERO}"
  head_nonzero "${STL}"
  if [[ -n "${HEIGHTMAP_OUTPUT}" ]]; then
    head_nonzero "${HEIGHTMAP_OUTPUT}"
  fi

  local matched
  matched=$(jq -e --arg url "${HEIGHTMAP_URL}" '
    [ .outputs[]? | select((.type//""|test("heightmap|texture";"i")) or (.name//""|test("heightmap";"i")))
      | (.source_url // .source // .input_url // "")
      | select(. == $url) ] | length > 0' /tmp/e2e_surface_manifest.json >/dev/null && echo true || echo false)

  if [[ "${matched}" != "true" ]]; then
    log "No output records the provided heightmap URL (${HEIGHTMAP_URL})"; exit 1
  fi
}

print_pass() {
  printf '{"status":"PASS","job_id":"%s","manifest_url":"%s","heightmap_url":"%s","hero":"%s","stl":"%s","subfolder":"%s"}\n' \
    "${JOB_ID}" "${MANIFEST_URL}" "${HEIGHTMAP_URL}" "${HERO}" "${STL}" "${SUBFOLDER}"
}

need_heightmap_url
maybe_upgrade_base
create_surface_job
poll_surface_job
fetch_manifest
validate_manifest
print_pass
log "Surface E2E proof PASS"
echo "✅ PASS: e2e_surface_proof.sh"
