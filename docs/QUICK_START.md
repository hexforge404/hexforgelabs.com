# Quick Start

Use this helper to run the Surface E2E against the most recent heightmap artifact from the shared engine output volume. It forces a `file://` heightmap URL to dodge TLS/localhost reachability issues inside containers.

## Prerequisites
- Surface stack running (e.g., `docker compose up -d` from repo root).
- Heightmap jobs already produced under `/data/hexforge3d/output` with filenames matching `*__heightmap.png`.
- Script is executable (already set in repo, but ensure with `chmod +x scripts/run_surface_from_latest_heightmap.sh`).

## Run it
```bash
# From repo root
scripts/run_surface_from_latest_heightmap.sh
```
What it does:
- Finds the newest `*__heightmap.png` in `/data/hexforge3d/output`.
- Exports `HEIGHTMAP_URL=file://...` (no HTTPS fetches) to avoid container networking/localhost/TLS issues.
- Defaults: `BASE_URL=https://localhost`, `CURL_INSECURE=1`, optional `SUBFOLDER` passed through to status lookups.
- Executes `scripts/e2e_surface_proof.sh`, printing the detected `job_id` plus manifest/hero/STL links when available.

## Overrides (optional)
- `HEIGHTMAP_OUTPUT_DIR` — override the source dir (default `/data/hexforge3d/output`; falls back to `/mnt/hdd-storage/ai-tools/engines/hexforge3d/output` if present on host).
- `BASE_URL` — point E2E at a different host (default `https://localhost`).
- `SUBFOLDER` — subfolder to use when fetching status/manifest (e.g., `proof-run`).
- `CURL_INSECURE` — set `0` to enforce TLS validation (default `1`).
- Extra args are passed through to `scripts/e2e_surface_proof.sh`, e.g.:
  ```bash
  BASE_URL=https://surface.local \
  SUBFOLDER=proof-run \
  scripts/run_surface_from_latest_heightmap.sh --keep-assets
  ```
