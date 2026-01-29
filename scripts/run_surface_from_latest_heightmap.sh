#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-https://localhost}
CURL_INSECURE=${CURL_INSECURE:-1}
HEIGHTMAP_API_KEY=${HEIGHTMAP_API_KEY:-}
SURFACE_API_KEY=${SURFACE_API_KEY:-}
SUBFOLDER=${SUBFOLDER:-${SURFACE_DEFAULT_SUBFOLDER:-smoke-test}}
POLL_MAX=${POLL_MAX:-30}
POLL_INTERVAL=${POLL_INTERVAL:-2}
SURFACE_BASE=${SURFACE_BASE:-/api/surface}
HEIGHTMAP_BASE=${HEIGHTMAP_BASE:-/api/store/heightmap}
HEIGHTMAP_FALLBACK_BASE=${HEIGHTMAP_FALLBACK_BASE:-/api/heightmap}
HEIGHTMAP_INTERNAL_BASE=${HEIGHTMAP_INTERNAL_BASE:-http://nginx}

curl_flags=(-s)
if [[ "${CURL_INSECURE}" == "1" ]]; then
  curl_flags+=(-k)
fi

hdr_heightmap=()
if [[ -n "${HEIGHTMAP_API_KEY}" ]]; then
  hdr_heightmap=(-H "x-api-key: ${HEIGHTMAP_API_KEY}")
fi

hdr_surface=(-H "Content-Type: application/json")
if [[ -n "${SURFACE_API_KEY}" ]]; then
  hdr_surface+=(-H "x-api-key: ${SURFACE_API_KEY}")
fi

log() { echo "[surface-helper] $*"; }
fail() { echo "[surface-helper] ERROR: $*" >&2; exit 1; }

default_public_root() {
  local sf="$1"; local jid="$2"
  if [[ -n "$sf" ]]; then
    echo "/assets/surface/${sf%/}/${jid}"
  else
    echo "/assets/surface/${jid}"
  fi
}

# 1) Get latest completed heightmap job via backend adapter
log "Fetching latest heightmap job..."
hm_id=""; hm_url=""; hm_subfolder=""; hm_manifest=""; hm_source="";
tmp_resp=$(mktemp)
for base in "${HEIGHTMAP_BASE}" "${HEIGHTMAP_FALLBACK_BASE}"; do
  code=$(curl "${curl_flags[@]}" "${hdr_heightmap[@]}" -w '%{http_code}' -o "${tmp_resp}" "${BASE_URL}${base}/latest?limit=25" || true)
  if [[ "${code}" == "404" ]]; then
    log "Heightmap latest not found at ${base} (404), trying fallback..."
    continue
  fi
  if [[ "${code}" == "000" || "${code}" -ge 500 ]]; then
    log "Heightmap latest returned ${code} at ${base}, trying fallback..."
    continue
  fi

  body=$(cat "${tmp_resp}")
  best_item=$(echo "${body}" | jq -c '((.items // []) | map(select((.heightmap_url // "") | test("heightmap\\.png|textures/heightmap"))) | .[0]) // .items[0]')
  hm_id=$(echo "${best_item}" | jq -r '.job_id // .id // empty')
  hm_url=$(echo "${best_item}" | jq -r '.heightmap_url // .heightmapUrl // empty')
  hm_subfolder=$(echo "${best_item}" | jq -r '.subfolder // ""')
  hm_manifest=$(echo "${best_item}" | jq -r '.manifest_url // .manifestUrl // empty')
  hm_source=${base}

  candidates=$(echo "${body}" | jq -r '.items[] | [.job_id // .id // "", .heightmap_url // .heightmapUrl // "", .subfolder // "", .manifest_url // .manifestUrl // ""] | @tsv')
  while IFS=$'\t' read -r cid curl_url csub cmanifest; do
    [[ -z "${cid}" || -z "${curl_url}" ]] && continue
    target="${curl_url}"
    [[ "${target}" != http* ]] && target="${BASE_URL}${target}"
    tmp_head=$(mktemp)
    status_head=$(curl "${curl_flags[@]}" -o /dev/null -D "${tmp_head}" -w '%{http_code}' -I "${target}" || true)
    len_head=$(awk '/[Cc]ontent-[Ll]ength:/ {print $2}' "${tmp_head}" | tail -n 1 | tr -d '\r')
    rm -f "${tmp_head}"
    if [[ "${status_head}" == "200" && -n "${len_head}" ]]; then
      if [[ ${len_head} -ge 1000 ]]; then
        hm_id="${cid}"
        hm_url="${curl_url}"
        hm_subfolder="${csub}"
        hm_manifest="${cmanifest}"
        break
      fi
    fi
  done <<< "${candidates}"

  if [[ -n "${hm_id}" && -n "${hm_url}" ]]; then
    break
  fi
done
rm -f "${tmp_resp}"

if [[ -z "${hm_id}" || -z "${hm_url}" ]]; then
  log "Primary adapters empty; falling back to /api/heightmap/v1/jobs..."
  fallback_resp=$(curl "${curl_flags[@]}" "${hdr_heightmap[@]}" "${BASE_URL}/api/heightmap/v1/jobs?limit=1&offset=0" || true)
  hm_id=$(echo "${fallback_resp}" | jq -r '.jobs.items[0].id // empty')
  hm_url=$(echo "${fallback_resp}" | jq -r '.jobs.items[0].public.heightmap_url // empty')
  hm_subfolder=""
  hm_manifest=""
  hm_source="/api/heightmap/v1/jobs"
fi

if [[ -z "${hm_id}" || -z "${hm_url}" ]]; then
  fail "No completed heightmap job found (id or heightmap_url missing)."
fi
log "Using heightmap job ${hm_id} (source ${hm_source}) -> ${hm_url}"

# 2) Create surface job
hm_url_abs="$hm_url"
if [[ ! "$hm_url_abs" =~ ^https?:// ]]; then
  hm_url_abs="${HEIGHTMAP_INTERNAL_BASE}${hm_url_abs}"
fi
payload=$(jq -n --arg url "$hm_url_abs" --arg id "$hm_id" --arg sf "$SUBFOLDER" '{source_heightmap_url:$url, source_heightmap_job_id:$id, subfolder:$sf}')
log "Submitting surface job to ${SURFACE_BASE}/jobs..."
create_resp=$(curl "${curl_flags[@]}" "${hdr_surface[@]}" -X POST -d "$payload" "${BASE_URL}${SURFACE_BASE}/jobs") || fail "Surface job create failed"
job_id=$(echo "$create_resp" | jq -r '.job_id // empty')
if [[ -z "${job_id}" ]]; then
  echo "$create_resp"
  fail "Surface job id missing in response"
fi
log "Surface job created: ${job_id}"

# 3) Poll status
polls=0
state="queued"
manifest_url=""
public_root="$(default_public_root "${SUBFOLDER}" "${job_id}")"
manifest_status=""
while (( polls < POLL_MAX )); do
  status_resp=$(curl "${curl_flags[@]}" "${hdr_surface[@]}" "${BASE_URL}${SURFACE_BASE}/jobs/${job_id}?subfolder=${SUBFOLDER}") || fail "Status check failed"
  state=$(echo "$status_resp" | jq -r '.state // .status // ""')
  progress=$(echo "$status_resp" | jq -r '.progress // 0')
  manifest_url=$(echo "$status_resp" | jq -r '.manifest_url // .manifestUrl // .result.manifest_url // .manifest.public.job_manifest // empty')
  public_root_resp=$(echo "$status_resp" | jq -r '.public_root // .publicRoot // empty')
  if [[ -n "$public_root_resp" ]]; then
    public_root="$public_root_resp"
  fi
  if [[ -z "$manifest_url" ]]; then
    manifest_url="${public_root%/}/job_manifest.json"
  fi
  log "Status: ${state} (${progress}%)"

  if [[ "$state" == "complete" ]]; then
    manifest_target="$manifest_url"
    if [[ ! "$manifest_target" =~ ^https?:// ]]; then
      manifest_target="${BASE_URL}${manifest_url}"
    fi
    manifest_status=$(curl "${curl_flags[@]}" -o /dev/null -w '%{http_code}' -I "${manifest_target}" || true)
    log "Manifest HEAD ${manifest_url} -> ${manifest_status}"
    if [[ "$manifest_status" == "200" ]]; then
      break
    fi
  fi
  if [[ "$state" == "failed" ]]; then
    echo "$status_resp"
    fail "Surface job failed"
  fi

  polls=$((polls + 1))
  sleep "${POLL_INTERVAL}"
done

if [[ "$state" != "complete" ]]; then
  fail "Surface job did not complete in time"
fi

if [[ -z "${manifest_url}" ]]; then
  manifest_url="${public_root%/}/job_manifest.json"
fi

manifest_target="$manifest_url"
if [[ ! "$manifest_target" =~ ^https?:// ]]; then
  manifest_target="${BASE_URL}${manifest_url}"
fi

if [[ -z "${manifest_status}" || "${manifest_status}" == "000" ]]; then
  manifest_status=$(curl "${curl_flags[@]}" -o /dev/null -w '%{http_code}' -I "${manifest_target}" || true)
fi

status_line=$(curl "${curl_flags[@]}" -I "${manifest_target}" | head -n 1 || true)

if [[ "${manifest_status}" != "200" ]]; then
  fail "Manifest not reachable (${manifest_status:-unknown}) at ${manifest_url}"
fi

assets_root="${manifest_url%/job_manifest.json}"
hero_url="${assets_root}/previews/hero.png"
stl_url="${assets_root}/product.stl"

log "Surface job complete"
log "Manifest: ${manifest_url}"
log "Hero:     ${hero_url}"
log "STL:      ${stl_url}"
log "Manifest HEAD: ${status_line}"

cat <<EOF
{
  "job_id": "${job_id}",
  "subfolder": "${SUBFOLDER}",
  "public_root": "${assets_root}",
  "manifest_url": "${manifest_url}",
  "hero_url": "${hero_url}",
  "stl_url": "${stl_url}",
  "manifest_status": "${manifest_status}"
}
EOF
