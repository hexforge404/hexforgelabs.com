#!/usr/bin/env bash
set -euo pipefail

# Lightweight UI-facing smoke: hit proxy status + manifest and verify assets resolve.
# Usage: SURFACE_SMOKE_BASE_URL=https://localhost SURFACE_DEFAULT_SUBFOLDER=smoke-test ./scripts/smoke_surface_ui_check.sh <job_id>

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
JOB_ID=${1:-}
SUBFOLDER=${SURFACE_DEFAULT_SUBFOLDER:-smoke-test}
API_KEY_HEADER=${SURFACE_API_KEY:+-H "x-api-key: ${SURFACE_API_KEY}"}

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

if [[ -z "${JOB_ID}" ]]; then
  echo "job_id is required" >&2
  exit 64
fi

maybe_upgrade_base

head_check() {
  local url=$1
  local abs="$url"
  [[ "$abs" == /* ]] && abs="${BASE_URL}${abs}"
  local status cl
  local hdr
  hdr=$(mktemp)
  status=$(curl "${CURL_FLAGS[@]}" -I ${API_KEY_HEADER} "$abs" -o /dev/null -D "${hdr}" -w "%{http_code}")
  cl=$(grep -i "content-length" "${hdr}" | tail -n1 | awk '{print $2}' | tr -d '\r')
  [[ -z "$cl" ]] && cl=0
  rm -f "${hdr}"
  if [[ ! "$status" =~ ^2 ]]; then
    log "Asset check failed: ${abs} status=${status} len=${cl}"
    return 1
  fi
  if [[ "$cl" -le 0 ]]; then
    log "Asset check failed: ${abs} zero length"
    return 1
  fi
  echo "$cl"
  return 0
}

log "Fetching status for job ${JOB_ID}"
status_json=$(curl_json "${BASE_URL}/api/store/surface/jobs/${JOB_ID}?subfolder=${SUBFOLDER}" ${API_KEY_HEADER})
printf "%s" "${status_json}" > /tmp/sf_ui_status.json
cat /tmp/sf_ui_status.json

manifest_url=$(jq -r '.manifest_url // .result.job_manifest // .result.public.job_manifest // empty' /tmp/sf_ui_status.json)
state=$(jq -r '.state // .status // ""' /tmp/sf_ui_status.json)
if [[ -z "$manifest_url" ]]; then
  log "No manifest_url in status"; exit 1; fi

log "Fetching manifest ${manifest_url}"
abs_manifest="$manifest_url"
[[ "$abs_manifest" == /* ]] && abs_manifest="${BASE_URL}${abs_manifest}"
manifest_json=$(curl_json "$abs_manifest" ${API_KEY_HEADER})
printf "%s" "${manifest_json}" > /tmp/sf_ui_manifest.json
cat /tmp/sf_ui_manifest.json

hero=$(jq -r '.outputs[] | select((.type//""|test("preview";"i"))) | .url // .public_url // empty' /tmp/sf_ui_manifest.json | head -n1)
stl=$(jq -r '.outputs[] | select((.type//""|test("stl";"i"))) | .url // .public_url // empty' /tmp/sf_ui_manifest.json | head -n1)

[[ -z "$hero" || -z "$stl" ]] && { log "Manifest missing hero or stl"; exit 1; }
hero_len=$(head_check "$hero")
stl_len=$(head_check "$stl")

printf '{"job_id":"%s","state":"%s","manifest_url":"%s","hero":"%s","stl":"%s","subfolder":"%s"}\n' \
  "$JOB_ID" "$state" "$manifest_url" "$hero (len=${hero_len})" "$stl (len=${stl_len})" "$SUBFOLDER"
log "UI status + manifest OK"
echo "✅ PASS: smoke_surface_ui_check.sh"
