#!/usr/bin/env bash
set -euo pipefail

# Pick the newest heightmap PNG in the shared engine output dir and run the surface E2E proof
# with a file:// HEIGHTMAP_URL (bypasses container TLS/localhost issues).

PRIMARY_OUTPUT_DIR=${HEIGHTMAP_OUTPUT_DIR:-/data/hexforge3d/output}
ALT_OUTPUT_DIR=/mnt/hdd-storage/ai-tools/engines/hexforge3d/output
OUTPUT_DIR=${PRIMARY_OUTPUT_DIR}
if [[ ! -d "${OUTPUT_DIR}" && -d "${ALT_OUTPUT_DIR}" ]]; then
  OUTPUT_DIR=${ALT_OUTPUT_DIR}
fi
SUBFOLDER=${SUBFOLDER:-}
DEFAULT_BASE_URL=${BASE_URL:-https://localhost}
DEFAULT_CURL_INSECURE=${CURL_INSECURE:-1}

if [[ ! -d "${OUTPUT_DIR}" ]]; then
  echo "[surface-latest] output directory missing: ${OUTPUT_DIR}" >&2
  exit 1
fi

latest_entry=$(find "${OUTPUT_DIR}" -maxdepth 1 -type f -name '*__heightmap.png' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n1 | cut -d' ' -f2-)
if [[ -z "${latest_entry}" && "${OUTPUT_DIR}" != "${ALT_OUTPUT_DIR}" && -d "${ALT_OUTPUT_DIR}" ]]; then
  echo "[surface-latest] primary output dir empty, trying ${ALT_OUTPUT_DIR}" >&2
  OUTPUT_DIR=${ALT_OUTPUT_DIR}
  latest_entry=$(find "${OUTPUT_DIR}" -maxdepth 1 -type f -name '*__heightmap.png' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n1 | cut -d' ' -f2-)
fi

if [[ -z "${latest_entry}" ]]; then
  echo "[surface-latest] no heightmap files found in ${OUTPUT_DIR}" >&2
  exit 1
fi

HEIGHTMAP_PATH="${latest_entry}"
if [[ "${OUTPUT_DIR}" == "${ALT_OUTPUT_DIR}" ]]; then
  rel_path="${latest_entry#${ALT_OUTPUT_DIR}}"
  rel_path="${rel_path#/}"
  HEIGHTMAP_PATH="${PRIMARY_OUTPUT_DIR%/}/${rel_path}"
fi

export HEIGHTMAP_URL="file://${HEIGHTMAP_PATH}"
export BASE_URL="${DEFAULT_BASE_URL}"
export CURL_INSECURE="${DEFAULT_CURL_INSECURE}"

echo "[surface-latest] using heightmap: ${HEIGHTMAP_URL}" >&2

LOG_FILE=$(mktemp)
# shellcheck disable=SC2086
scripts/e2e_surface_proof.sh "$@" | tee "${LOG_FILE}"
status=$?

job_id=$(grep -Eo 'job_id"?[:=]"?[A-Za-z0-9_-]+' "${LOG_FILE}" | head -n1 | sed -E 's/.*job_id"?[:=]"?//')
if [[ -n "${job_id}" ]]; then
  echo "[surface-latest] surface job id: ${job_id}" >&2

  status_url="${BASE_URL%/}/api/store/surface/jobs/${job_id}"
  if [[ -n "${SUBFOLDER}" ]]; then
  status_url="${status_url}?subfolder=${SUBFOLDER}"
  fi

  status_json=$(mktemp)
  if curl -ks "${status_url}" -o "${status_json}"; then
    PY_BIN=${PY_BIN:-python3}
    if ! command -v "${PY_BIN}" >/dev/null 2>&1; then
      PY_BIN=python
    fi

    if command -v "${PY_BIN}" >/dev/null 2>&1; then
      STATUS_JSON="${status_json}" SUBFOLDER="${SUBFOLDER}" "${PY_BIN}" - <<'PY'
import json
import os
import os.path

path = os.environ.get("STATUS_JSON")
subfolder = os.environ.get("SUBFOLDER", "")
if not path or not os.path.exists(path):
  raise SystemExit

with open(path, "r", encoding="utf-8") as f:
  try:
    data = json.load(f)
  except Exception:
    raise SystemExit

manifest = data.get("manifest") or data.get("result", {}).get("manifest") or {}
manifest_url = (
  data.get("manifest_url")
  or manifest.get("manifest_url")
  or (manifest.get("public", {}) or {}).get("job_manifest")
  or ""
)
public_root = (
  manifest.get("public_root")
  or (manifest.get("public", {}) or {}).get("public_root")
  or (manifest.get("public", {}) or {}).get("public_root_url")
  or ""
)

def normalize(base, candidate):
  if not candidate:
    return None
  raw = str(candidate).strip()
  if not raw:
    return None
  if raw.startswith("http://") or raw.startswith("https://") or raw.startswith("/assets/surface/"):
    return raw
  base_clean = base.rstrip("/")
  rel = raw.lstrip("/")
  return f"{base_clean}/{rel}" if base_clean else f"/assets/surface/{rel}"

def pick_preview():
  previews = (manifest.get("public", {}) or {}).get("previews") or (manifest.get("public", {}) or {}).get("blender_previews_urls") or {}
  hero = previews.get("hero") or previews.get("iso") or previews.get("top") or previews.get("side")
  return normalize(public_root, hero) or normalize(public_root, "previews/hero.png")

def pick_stl():
  outputs = manifest.get("outputs") or {}
  items = []
  if isinstance(outputs, dict):
    for k, v in outputs.items():
      if isinstance(v, dict):
        v = dict(v)
        v.setdefault("type", k)
        items.append(v)
      else:
        items.append({"type": k, "url": v})
  elif isinstance(outputs, list):
    items = outputs

  for o in items:
    label = str(o.get("url") or o.get("path") or o.get("public_url") or o.get("name") or o.get("label") or "").lower()
    if label.endswith(".stl") or "stl" in label:
      return normalize(public_root, o.get("url") or o.get("path") or o.get("public_url") or o.get("name") or o.get("label"))
  return normalize(public_root, "product.stl")

hero_url = pick_preview()
stl_url = pick_stl()

if manifest_url:
  print(f"[surface-latest] manifest: {manifest_url}")
if hero_url:
  print(f"[surface-latest] hero: {hero_url}")
if stl_url:
  print(f"[surface-latest] stl: {stl_url}")
PY
    else
      echo "[surface-latest] warning: python is not available to summarize outputs" >&2
    fi
  else
  echo "[surface-latest] warning: status fetch failed from ${status_url}" >&2
  fi
  rm -f "${status_json}"
else
  echo "[surface-latest] surface job id not detected" >&2
fi

rm -f "${LOG_FILE}"
exit ${status}
