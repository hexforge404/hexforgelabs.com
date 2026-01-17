# Fix Plan — Heightmap & GlyphEngine

| Priority | Fix / Improvement | Impacted Files / Services | Expected Outcome | How to Test |
|---|---|---|---|---|
| P0 | Remove assistant privileges and Docker socket – edit docker-compose.yml to drop `privileged: true` and remove `/var/run/docker.sock` mount. Limit capabilities to only what is necessary. | `docker-compose.yml` (assistant service) | Assistant container no longer has host-root equivalent powers; reduced attack surface. | `docker compose up -d --build` then `docker inspect hexforge-assistant --format '{{.HostConfig.Privileged}}'` should be `false`. Mount list should not include docker.sock. |
| P0 | Ensure engine scripts and venv exist – populate `/mnt/hdd-storage/ai-tools/engines/hexforge3d` with venv + `bin/gray2heightmap.py` + `bin/gray2stl.py` (or adjust `HEXFORGE3D_ENGINE_DIR`). | Host filesystem; assistant env vars | Heightmap jobs succeed; `/api/heightmap` does not return `ENGINE_NOT_READY`. | `ls -l` verify python + scripts; submit heightmap job; confirm it reaches `done` and outputs exist under output dir. |
| P0 | Create required directories and set permissions – ensure `output`, `surface`, and `jobs/heightmap` subdirectories exist under engine root and are writable by engine users (uid 10001, gid 1001). | Host filesystem; `docker-compose.yml` volumes; init script | Engines persist outputs and job metadata across restarts. | Run init script; `stat` directories; submit jobs; restart containers and confirm outputs remain. |
| P1 | Harden glyphengine volume mounts – mount `/.../hexforge3d/surface` as RW and mount the rest of engine root RO. Optionally enable `read_only: true`. | `docker-compose.yml` (glyphengine service) | Glyphengine cannot overwrite unrelated engine data. | `docker inspect` confirms mounts; surface job writes output successfully. |
| P1 | Add authentication & rate limiting – API key middleware for heightmap/surface or NGINX basic auth. Alternatively `limit_req_zone` per IP. | `assistant/routes/heightmap.py`, `hse/main.py`, `nginx/default.conf` | Prevent anonymous abuse of compute resources. | Call APIs without key → `401/429`. Call with key → success. |
| P1 | Sanitise `_publish_to_assets` – ensure dst resolves under OUTPUT_DIR and refuse symlinks; copy only regular files. | `assistant/routes/heightmap.py` | Prevent path traversal / symlink attacks during asset publication. | Attempt to publish symlinked content; ensure rejected/ignored; normal jobs still publish assets. |
| P2 | Improve health endpoints – verify interpreter/scripts/dirs in health responses; fail fast when missing. | `assistant/routes/heightmap.py`, `hse/main.py` | Orchestration detects misconfig early; fewer “mystery failures”. | Break a prerequisite (rename python), health should return 503 and container healthcheck should fail. |
| P2 | Add structured logging & metrics – structured logs and optional Prometheus metrics for job counts/durations/failures. | `assistant/main.py`, `hse/main.py` | Easier monitoring/troubleshooting. | Observe structured logs; scrape metrics endpoint if added. |
| P2 | Secrets management – move tokens to Docker secrets or vault; avoid world-readable `.env` on host. | `.env*`, `docker-compose.yml` | Reduced risk of secret leakage. | Confirm services still function with secrets mounted from secrets files; ensure secrets never appear in logs. |
directs enforce HTTPS and separate a tools subdomain.

### Job isolation & sanitisation
Heightmap and surface job APIs sanitise job IDs, names and subfolder values (allowing only alphanumeric,
dash and underscore) to prevent directory traversal. The assistant writes jobs into per-job directories under
`/data/hexforge3d/jobs/heightmap` and never trusts client-supplied job IDs. Glyphengine similarly validates
job identifiers and writes a `job.json` and manifest.

### CORS & CSRF protection
The assistant enforces CORS via an `allow_origin_regex` that permits only `*.hexforgelabs.com`, `localhost`
and `10.0.0.200`. WebSocket connections validate the Origin header and reject unauthorised domains.

### CI quality gates
A GitHub Action checks that any pull request which modifies code includes a diff report. If code changes are
present and no report is added under `docs/diffs/`, the workflow fails the build and guides developers to
generate the report.

## Key risks & issues

### Heightmap engine not bundled
The assistant expects the engine’s Python executable at `/data/hexforge3d/venv/bin/python` and scripts
`bin/gray2heightmap.py` / `gray2stl.py` inside `ENGINE_DIR`. These files must exist in the mounted volume;
otherwise the `/api/heightmap` endpoint returns `ENGINE_NOT_READY`.

### Persistent storage
Heightmap jobs are saved under `/data/hexforge3d/jobs/heightmap` while outputs are written to
`/data/hexforge3d/output`. The glyphengine writes to `/data/hexforge3d/surface`. The docker compose file
mounts `/mnt/hdd-storage/ai-tools/engines/hexforge3d` into both the NGINX and engine containers. If the host
directory is missing subfolders (`venv`, `bin`, `output`, `surface`, `jobs`), the engines will silently fail or return
incomplete results. This mount must be created and given correct ownership (`uid 10001 / gid 1001` for
glyphengine) and write permissions for the assistant.

### Assistant container privileges
The assistant runs with `privileged: true` and mounts `/var/run/docker.sock` into the container. Privileged mode
combined with access to the docker socket effectively grants root on the host. Additionally, the assistant exposes
endpoints such as `/tool/docker` that execute `docker ps` via subprocess. An attacker interacting with the chat or an
exploited endpoint could leverage these capabilities to escape the container. This is a serious P0 risk.

### Unsanitised file copying
The heightmap API copies uploaded images and engine outputs into a public assets directory using `shutil.copy2`.
It does not strip symlinks or ensure that `dst` resides under the intended `OUTPUT_DIR`. If an attacker manages to
create a symlink within `/data/hexforge3d/output` (e.g., by uploading a crafted job via another vulnerability), they
could cause arbitrary file disclosure or overwrite.

### Exposure of internal tokens
Environment variables such as `SCRIPT_LAB_TOKEN` and `MEDIA_API_KEY` are injected into the assistant and backend
containers via `.env` files. While not printed in responses, the assistant exposes endpoints (`/tool/script-save`,
`/tool/memory`, etc.) that call internal services using these tokens. If the assistant is compromised, these secrets
could be leaked. Secrets should be scoped to the least privilege required and never mounted from world-readable
host files.

### Heightmap preview generation
Blender is invoked inside the assistant to produce STL previews. The assistant container is privileged and includes
GPU drivers only if present; preview generation may fail silently if Blender is missing, causing job statuses to
remain “running” or returning partial results. Logging is minimal; the user may see `blender_previews_failed`
warnings.

### No authentication on job APIs
Both heightmap and surface APIs are public; any Internet user can POST new jobs and consume compute resources.
Rate limiting or authentication would prevent abuse.

## Current Working State by Sub-System

| Subsystem | Observed State & Comments |
|---|---|
| Frontend / SPA | The React SPA (served by NGINX) is built and served from `/usr/share/nginx/html`. It relies on API endpoints exposed under `/api/` and `/tool/`. No major issues observed in configuration; static assets are cached for one year and hashed file names are used. |
| NGINX | NGINX listens on ports 80, 443 and 8088. It enforces HTTPS and proxies to the backend, assistant and glyphengine. Aliases map static asset paths to host-mounted volumes and autoindex is disabled. Health check endpoints exist under `/health`. Security headers and path restrictions are configured. |
| Backend | Built from `./backend`. It depends on MongoDB and a media API. The compose file sets `MEDIA_API_URL` and `MEDIA_API_KEY` and mounts `/mnt/hdd-storage` for persistent storage. Health check implemented at `/health`. CI enforces diff reports. |
| Assistant / Heightmap API | FastAPI application providing chat tools and heightmap API. It uses environment variables `HEXFORGE3D_ENGINE_DIR`, `HEIGHTMAP_OUTPUT_DIR`, `HEIGHTMAP_JOBS_DIR`, etc. Heightmap API writes job info into `/data/hexforge3d/jobs/heightmap` and publishes outputs under `/data/hexforge3d/output`. CORS restricts origin to hexforgelabs.com and local IPs. It is started on port 11435 and proxied via NGINX. The service is marked as healthy if `/health` responds. However, the container runs privileged and can access the host’s docker socket; this is a critical security issue. |
| Heightmap Engine | Implemented in `assistant/tools/heightmap_engine.py`. It expects a Python virtual environment under `/data/hexforge3d/venv/bin/python` and scripts `gray2heightmap.py` and `gray2stl.py` in `bin/`. It writes heightmap PNGs, STL files and a manifest into `HEXFORGE3D_OUTPUT_DIR`. The API uses `_publish_to_assets` to copy outputs into NGINX’s public assets directory. If the venv or scripts are missing, jobs return `ENGINE_NOT_READY`. Write permission on the host mount is required. |
| Heightmap Job Storage | Jobs are persisted into `/data/hexforge3d/jobs/heightmap` (uploads, meta and artifacts). Each job has its own directory and JSON metadata file. Without a persistent host volume this data disappears on container restart. |
| GlyphEngine / Surface API | Resides in `hexforge-glyphengine`. FastAPI service under `/api/surface` with job creation and status routes. Uses environment variables `SURFACE_OUTPUT_DIR` (default `/data/hexforge3d/surface`) and `SURFACE_PUBLIC_PREFIX` (default `/assets/surface`). Generates job JSON and manifest and sets status based on existence of hero preview, texture, heightmap and STL. The container runs as non-root user 10001 and can write to the mounted host volume; volumes can be tightened further. |
| Docker Compose | Defines all services and mounts host directories. Notably, the assistant is privileged and mounts `/var/run/docker.sock` and an SSH key, while glyphengine is configured as a normal user and includes an optional `read_only` parameter (commented). Health checks for each service are defined. |
| CI / GitHub Actions | Diff report validation ensures PRs that include code changes also include a corresponding diff report file under `docs/diffs/`. This is effective for code review quality. |

## Critical Path Checklist to get Heightmap & GlyphEngine usable

1) **Prepare host storage**
- Create the host directory `/mnt/hdd-storage/ai-tools/engines/hexforge3d` if it does not exist.
- Within it create subdirectories: `venv/`, `bin/`, `output/`, `surface/`, `jobs/heightmap/meta`, `jobs/heightmap/uploads`,
  `jobs/heightmap/artifacts` and `input/`.
- Ensure the venv contains a Python 3 environment with `gray2heightmap.py` and `gray2stl.py` in `bin/` (or adjust
  `HEXFORGE3D_ENGINE_DIR` accordingly).
- Assign ownership to the group used by the engine containers (gid 1001) and set appropriate write permissions.

2) **Verify environment variables**
- In `docker-compose.yml`, ensure assistant env vars (`HEXFORGE3D_ENGINE_DIR`, `HEIGHTMAP_OUTPUT_DIR`,
  `HEIGHTMAP_JOBS_DIR`, `HEIGHTMAP_TMP_DIR`) point to the correct host-mounted directories.
- Ensure glyphengine uses `SURFACE_OUTPUT_DIR=/data/hexforge3d/surface` and `SURFACE_PUBLIC_PREFIX=/assets/surface`.
- Both must match NGINX alias paths.

3) **Remove unnecessary privileges**
- Drop `privileged: true` and the `/var/run/docker.sock` mount from the assistant container.
- If the assistant needs to run Blender, mount only the GPU devices and necessary host resources with explicit read/write flags.
- Restrict capabilities to those required.

4) **Limit host volume access**
- For glyphengine, mount only `/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface` read-write and mount the rest read-only.
- For the assistant, avoid mounting the entire host path read-write; mount only output and jobs paths as needed.

5) **Implement authentication & rate limiting**
- Introduce API keys or user authentication for `/api/heightmap` and `/api/surface`.
- At minimum, enable IP-based rate limiting via NGINX.

6) **Sanitise asset publication**
- In `_publish_to_assets` (heightmap route), ensure destination is always within `OUTPUT_DIR` by resolving paths before copying.
- Refuse symlinks and ensure `src` is a regular file.

7) **Improve engine health checks**
- Augment `/api/heightmap/health` and `/api/surface/health` to verify engine interpreter/scripts/dirs exist.
- Fail health checks when prerequisites are missing to make orchestration reliable.

8) **Logging & monitoring**
- Capture logs from Blender preview generation and engine subprocess calls and forward them to a central log aggregator.
- Provide warnings to users when previews fail.
- Consider metrics (job counts, durations, failures).

9) **Back up job data**
- Schedule backups of `/mnt/hdd-storage/ai-tools/engines/hexforge3d/jobs/heightmap` and `surface` directories.
- Monitor disk usage.

## Risk Notes & Security Considerations

- **Privilege escalation & Docker socket**: Mounting `/var/run/docker.sock` and running privileged grants root on host.
  This is the single highest-priority risk and must be removed.
- **Lack of authentication**: Public endpoints allow unlimited job submissions; add API keys/auth + rate limiting.
- **Secrets management**: Protect `.env` files; consider Docker secrets or a dedicated secrets manager.
- **File system permissions**: Limit host directory write permissions; mitigate symlink attacks by copying only regular files.
- **CORS & CSRF**: Ensure state-changing endpoints require CSRF tokens when used from browsers.
- **Resource starvation**: Apply CPU/memory limits to isolate heavy workloads.
- **Dependency updates**: Keep Python venv patched; consider CI security scanning.

## Verify Commands

### Check container health
```bash
docker compose ps
docker compose logs assistant glyphengine
curl -f http://localhost:11435/health
curl -f http://localhost:11435/api/heightmap/health
curl -f http://localhost:8092/api/surface/health
