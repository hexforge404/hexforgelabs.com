# Diff Report — 2026-01-16 — Engines Online Hardening

## Summary
- Dropped assistant container privilege/socket exposure and gated Docker tools behind `ENABLE_DOCKER_TOOLS` (default false).
- Added idempotent storage bootstrap for `/mnt/hdd-storage/ai-tools/engines/hexforge3d` with correct ownership.
- Hardened heightmap publish path, added API-key checks, and made health endpoints fail fast on missing engine assets.
- Routed surface API through backend with optional API key, rate limiting, and richer request diagnostics.
- Surface proxy now forwards a default subfolder to avoid 404s when jobs are stored under grouped folders (e.g. smoke-test).
- Added nginx rate limits and verification runbook covering health and job flows.

## Changed Files
- `docker-compose.yml`
- `assistant/main.py`
- `assistant/routes/heightmap.py`
- `assistant/tools/docker.py`
- `backend/main.js`
- `backend/routes/surface.js`
- `nginx/default.conf`
- `scripts/hexforge3d_storage_init.sh`
- `docs/verify/VERIFY_ALL.md`

## Detailed Changes
- Assistant service no longer runs privileged or with the host Docker socket; Docker tool endpoints now return 403 unless explicitly enabled.
- Storage init script builds required output/jobs/surface trees with uid 10001 and gid 1001, preserving setgid for shared group writes.
- Heightmap publish helper refuses symlinks and enforces destinations inside the output directory; health endpoints surface missing dirs/engine binaries with 503.
- Optional API keys accepted via `X-API-Key` or `api_key` for heightmap and surface; nginx now rate-limits both APIs.
- Surface traffic now flows through backend proxy with request IDs, timing logs, and upstream health forwarding to satisfy nginx health checks.
- Added verification guide covering health checks, job submission, rate limits, and docker-tool gating expectations.

## Review Checklist
- [ ] Compose up succeeds without privileged assistant; verify assistant health remains green.
- [ ] Run `scripts/hexforge3d_storage_init.sh` and confirm ownerships are `10001:1001`.
- [ ] Heightmap health returns 503 when paths or engine python are missing; 200 when ready.
- [ ] Surface health (`/api/surface/health`) proxies correctly and nginx healthcheck passes.
- [ ] Rate limits observed on `/api/heightmap/` and `/api/surface/` (429 on burst).
- [ ] Docker tool endpoints return 403 until `ENABLE_DOCKER_TOOLS` and socket access are explicitly enabled.
