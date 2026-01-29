# Surface Engine Quick Start

This quick start follows the Surface Engine integration contract: surface assets live under `/assets/surface/<subfolder>/<job_id>/` with a `job_manifest.json` describing outputs. Use these steps to stand up and validate the stack.

## Prerequisites
- Docker + docker compose
- `curl`, `jq`
- Host storage mounted at `/var/www/hexforge3d/surface` (see below)

## 1) Prepare storage (idempotent)
```bash
sudo ./scripts/hexforge3d_storage_init.sh
```

## 2) Optional environment
```bash
export HEIGHTMAP_API_KEY=""        # optional; leave empty for dev
export SURFACE_API_KEY=""          # optional; leave empty for dev
export SURFACE_DEFAULT_SUBFOLDER="smoke-test"  # default surface folder
```

## 3) Build & start services
```bash
docker compose up -d --build
```
Expect backend, nginx, surface-engine containers healthy.

## 4) Health checks (through nginx)
```bash
curl -sk -H "x-api-key: ${HEIGHTMAP_API_KEY}" https://localhost/api/heightmap/health | jq
curl -sk -H "x-api-key: ${SURFACE_API_KEY}"   https://localhost/api/surface/health | jq
curl -sk https://localhost/api/store/heightmap/latest | jq
curl -sk https://localhost/api/heightmap/latest | jq
curl -sk https://localhost/api/store/surface/latest | jq
```
Both should return `ok: true` (or engine-specific status for surface).

## 5) Run a surface job from the latest heightmap (helper)
```bash
# Uses https://localhost by default; set BASE_URL to override.
# For self-signed TLS, leave CURL_INSECURE=1 (default).
chmod +x scripts/run_surface_from_latest_heightmap.sh
BASE_URL=https://localhost \
CURL_INSECURE=1 \
SUBFOLDER="${SURFACE_DEFAULT_SUBFOLDER}" \
./scripts/run_surface_from_latest_heightmap.sh
```
What it does:
- Finds the most recent completed heightmap job.
- Submits a surface job that consumes that heightmap.
- Polls until complete and prints the asset path (manifest + hero + STL) under `/assets/surface/<subfolder>/<job_id>/`.

# Quick smoke checklist
curl -skI https://localhost/api/heightmap/latest
curl -skI https://localhost/api/store/heightmap/latest
scripts/run_surface_from_latest_heightmap.sh

## 6) Manual surface job (optional)
```bash
SURF_AUTH="-H x-api-key:${SURFACE_API_KEY}"
payload='{"source_heightmap_url":"<heightmap_url>","source_heightmap_job_id":"<job_id>","subfolder":"'"'"${SURFACE_DEFAULT_SUBFOLDER}'"'""}'
curl -sk ${SURF_AUTH} -H "Content-Type: application/json" \
  -d "${payload}" \
  https://localhost/api/surface/jobs | jq
```
Poll with:
```bash
JOB_ID=<returned-job-id>
curl -sk ${SURF_AUTH} "https://localhost/api/surface/jobs/${JOB_ID}?subfolder=${SURFACE_DEFAULT_SUBFOLDER}" | jq
```

## 7) Asset contract verification
- Assets resolve at `/assets/surface/<subfolder>/<job_id>/` via nginx alias to `/var/www/hexforge3d/surface`.
- Manifest file is `/assets/surface/<subfolder>/<job_id>/job_manifest.json` (previews are referenced in the manifest; no `previews.json` is emitted).
- Hero preview typically lives at `/assets/surface/<subfolder>/<job_id>/previews/hero.png` (see manifest `outputs`).
- STL present at `/assets/surface/<subfolder>/<job_id>/enclosure/enclosure.stl` (scripts may mention `/product.stl` as a legacy fallback, but the emitted file is `enclosure/enclosure.stl`).
- `GET /api/surface/latest` lists recent jobs with hero, STL, manifest URLs.
- Swagger available at `/api/surface/docs` through nginx.

Compatibility: prefer manifest-provided URLs; deterministic fallbacks (e.g., `/product.stl`) may vary.

If any step fails, fix before proceeding; do not force-push or rewrite history.

## 8) UI smoke (admin/store parity)
- Admin login: visit https://localhost/admin-login, authenticate, and confirm the menu now shows an **Admin** link. Log out and confirm the link disappears.
- Surface promote: on /surface, run a job, hit **Promote to Product**, and note the SKU (defaults to `surf-<job_id>`). A success toast should appear.
- Store visibility: visit /store and verify the promoted SKU renders (no fallback cards).
- Admin visibility: visit /admin → Products tab and verify the same SKU is listed, even if it lacks images or tags.
- Sanity scripts:
  - `HOST=https://localhost ADMIN_COOKIE="$(cat scripts/admin.cookie)" scripts/sanity-admin-session.sh`
  - `SKU=surf-<job_id> HOST=https://localhost ADMIN_COOKIE="$(cat scripts/admin.cookie)" scripts/sanity-products-parity.sh`
  - Optional DB check: add `DB_CHECK=1` to parity script to dump the Mongo document.

### Surface UI smoke (5 minutes)
- Open /surface at 1440×900 (100% zoom); verify no panel overlaps; scroll within panels (manifest/job JSON) works.
- Toggle heightmap select, refresh heightmaps, and run **Generate Relief** (can fail gracefully); ensure buttons don’t clip.
- In Live preview + 3D: thumbnails and 3D toolbar stay on one line or wrap cleanly; no overlap at 110% zoom.
- In Status pane: chips and download buttons remain visible; progress row does not wrap awkwardly at 1280px.
- At 1024px and below: panels stack vertically; no horizontal scroll; 3D viewer and previews fit the container.

## Option A: Run sanity scripts against the same host you use in the browser
- Why: The admin cookie is scoped to a host. If you log in at https://hexforgelabs.com you must point the scripts to https://hexforgelabs.com; localhost cookies will not work across hosts.
- Get the cookie:
  1. Log in to the admin UI in your browser on the target host (e.g., https://hexforgelabs.com/admin-login).
  2. In devtools, open Application/Storage → Cookies → that host → copy the `hexforge.sid` value.
  3. Save it locally: `echo "hexforge.sid=<value>" > scripts/admin.cookie` or export `ADMIN_COOKIE="hexforge.sid=<value>"`.
  4. Helper: `scripts/print-cookie-help.sh` echoes the steps and shows any cached cookie files.
- Run the checks with matching HOST:
  - `HOST=https://hexforgelabs.com ADMIN_COOKIE="$(cat scripts/admin.cookie)" scripts/sanity-admin-session.sh`
  - `SKU=surf-<job_id> HOST=https://hexforgelabs.com ADMIN_COOKIE="$(cat scripts/admin.cookie)" scripts/sanity-products-parity.sh`
- DB checks are local-only: when HOST is not localhost/127.0.0.1 the parity script skips Mongo automatically.

## 2-minute store/admin verification
- Public store list: `curl -sk "${HOST:-https://hexforgelabs.com}/api/products?raw=true" | jq 'length'`
- Admin list (needs cookie): `curl -sk "${HOST:-https://hexforgelabs.com}/api/admin/products" -H "Cookie: $(cat scripts/admin.cookie)" | jq 'length'`
- Count parity + missing details: `HOST=${HOST:-https://hexforgelabs.com} ADMIN_COOKIE="$(cat scripts/admin.cookie)" scripts/sanity-store-count.sh`
- Single SKU parity (surface promotions): `SKU=surf-<job_id> HOST=${HOST:-https://hexforgelabs.com} ADMIN_COOKIE="$(cat scripts/admin.cookie)" scripts/sanity-products-parity.sh`
