#!/usr/bin/env bash
set -euo pipefail

BASE=${HEXFORGE3D_BASE:-/mnt/hdd-storage/ai-tools/engines/hexforge3d}
ENGINE_UID=${HEXFORGE3D_UID:-10001}
ENGINE_GID=${HEXFORGE3D_GID:-1001}

DIRS=(
  "$BASE"
  "$BASE/output"
  "$BASE/output/previews"
  "$BASE/jobs"
  "$BASE/jobs/heightmap"
  "$BASE/jobs/heightmap/uploads"
  "$BASE/jobs/heightmap/meta"
  "$BASE/jobs/heightmap/artifacts"
  "$BASE/tmp"
  "$BASE/surface"
)

printf "[init] preparing hexforge3d storage at %s (uid=%s gid=%s)\n" "$BASE" "$ENGINE_UID" "$ENGINE_GID"

for dir in "${DIRS[@]}"; do
  install -d -m 2775 -o "$ENGINE_UID" -g "$ENGINE_GID" "$dir"
  printf "[init] ensured %s\n" "$dir"
done

if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
  # Ensure existing top-level contents inherit the target ownership
  find "$BASE" -maxdepth 2 -type d -print0 | xargs -0 chown "$ENGINE_UID:$ENGINE_GID"
else
  printf "[init] warning: not running as root, skipped chown (dirs created with target ownership)\n"
fi

printf "[init] done. verify with: ls -ld %s\n" "$BASE"
