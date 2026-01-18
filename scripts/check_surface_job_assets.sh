#!/usr/bin/env bash
set -euo pipefail

# Validate a surface job's assets exist in the shared assets directory.
# Usage: SURFACE_ASSETS_DIR=/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface ./scripts/check_surface_job_assets.sh <job_id> [subfolder]
# Defaults: SURFACE_ASSETS_DIR=/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface, subfolder=${SURFACE_DEFAULT_SUBFOLDER:-smoke-test}

ASSETS_ROOT=${SURFACE_ASSETS_DIR:-/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface}
JOB_ID=${1:-}
SUBFOLDER=${2:-${SURFACE_DEFAULT_SUBFOLDER:-smoke-test}}

if [[ -z "${JOB_ID}" ]]; then
  echo "Usage: $0 <job_id> [subfolder]" >&2
  exit 64
fi

JOB_ROOT="${ASSETS_ROOT%/}/${SUBFOLDER}/${JOB_ID}"
MANIFEST="${JOB_ROOT}/job_manifest.json"
HERO=$(find "${JOB_ROOT}" -maxdepth 2 -type f \( -name 'hero.*' -o -name '*preview*.png' -o -name 'hero.png' \) | head -n1 || true)
STL=$(find "${JOB_ROOT}" -maxdepth 2 -type f -name '*.stl' | head -n1 || true)

missing=()
[[ -f "${MANIFEST}" ]] || missing+=("manifest")
[[ -n "${HERO}" ]] || missing+=("preview")
[[ -n "${STL}" ]] || missing+=("stl")

printf "Job root: %s\n" "${JOB_ROOT}"
printf "Manifest: %s\n" "${MANIFEST}"
printf "Preview:  %s\n" "${HERO:-<none>}"
printf "STL:      %s\n" "${STL:-<none>}"

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing: ${missing[*]}" >&2
  exit 1
fi

exit 0
