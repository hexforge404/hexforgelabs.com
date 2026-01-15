# Testing Guide (Backend)

## Prerequisites
- Node 18 (matches backend Docker image)
- From repo root: `cd backend && npm install` (installs test deps).

## Run backend tests locally
```bash
cd backend
npm test
```

## Run backend tests inside Docker
```bash
cd /path/to/hexforge-store
docker compose run --rm backend npm test
```

## Heightmap smoke (when engine is running)
```bash
cd /mnt/hdd-storage/hexforge-store
docker compose up --build -d heightmapengine backend nginx
bash scripts/smoke-heightmap.sh
```

## Run both (helper script)
```bash
bash scripts/test-all.sh
```

## What is covered
- Contract validation helpers (AJV): valid envelopes, extra-field stripping, error wrapping.
- `/api/surface` proxy behavior: schema enforcement, error wrapping, docs proxying without leaking engine host.

## Notes
- Tests mock GlyphEngine via nock; no external services are needed.
- Frontend tests continue to run via CRA (`npm test` in frontend) and are unchanged.
