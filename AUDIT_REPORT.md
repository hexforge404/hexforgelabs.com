# HexForge Platform Audit Report (Heightmap & Surface Engine)

## Executive Summary

HexForge Labs deploys a self-hosted micro-services stack backed by Docker and NGINX.
The stack includes a frontend SPA, NGINX reverse proxy, backend API, assistant service (FastAPI),
heightmap engine, surface engine, a media API, MongoDB, and an Ollama LLM container.
Routing is centralised through NGINX and static assets are served from a host-mounted volume. FastAPI
services expose REST endpoints and provide job creation/status APIs for heightmap and surface generation.
Continuous integration enforces diff reports on pull requests.

## What’s working well

### Routing & security
NGINX terminates TLS and proxies `/api/heightmap/` to the assistant service and `/api/surface/` to
the surface engine. Alias directives map `/assets/heightmap/` to `/var/www/hexforge3d/output/` and
`/assets/surface/` to `/var/www/hexforge3d/surface/`, aligning with the engines’ output directories.
Security headers and path blocking rules (blocking `.php`, `.env`, `wp-admin`, `.git`, etc.) are in place.
Automatic 301 redirects enforce HTTPS and separate a tools subdomain.

### Job isolation & sanitisation
Heightmap and surface job APIs sanitise job IDs, names and subfolder values (allowing only alphanumeric,
dash and underscore) to prevent directory traversal. The assistant writes jobs into per-job directories under
`/data/hexforge3d/jobs/heightmap` and never trusts client-supplied job IDs. The surface engine similarly
validates job identifiers and writes a `job.json` and manifest.

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
`/data/hexforge3d/output`. The surface engine writes to `/data/hexforge3d/surface`. The docker compose file
mounts `/mnt/hdd-storage/ai-tools/engines/hexforge3d` into both the NGINX and engine containers. If the host
directory is missing subfolders (`venv`, `bin`, `output`, `surface`, `jobs`), the engines will silently fail or return
incomplete results. This mount must be created and given correct ownership (`uid 10001 / gid 1001` for the
surface engine) and write permissions for the assistant.

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
| NGINX | NGINX listens on ports 80, 443 and 8088. It enforces HTTPS and proxies to the backend, assistant and surface engine. Aliases map static asset paths to host-mounted volumes and autoindex is disabled. Health check endpoints exist under `/health`. Security headers and path restrictions are configured. |
| Backend | Built from `./backend`. It depends on MongoDB and a media API. The compose file sets `MEDIA_API_URL` and `MEDIA_API_KEY` and mounts `/mnt/hdd-storage` for persistent storage. Health check implemented at `/health`. CI enforces diff reports. |
| Assistant / Heightmap API | FastAPI application providing chat tools and heightmap API. It uses environment variables `HEXFORGE3D_ENGINE_DIR`, `HEIGHTMAP_OUTPUT_DIR`, `HEIGHTMAP_JOBS_DIR`, etc. Heightmap API writes job info into `/data/hexforge3d/jobs/heightmap` and publishes outputs under `/data/hexforge3d/output`. CORS restricts origin to hexforgelabs.com and local IPs. It is started on port 11435 and proxied via NGINX. The service is marked as healthy if `/health` responds. However, the container runs privileged and can access the host’s docker socket; this is a critical security issue. |
| Heightmap Engine | Implemented in `assistant/tools/heightmap_engine.py`. It expects a Python virtual environment under `/data/hexforge3d/venv/bin/python` and scripts `gray2heightmap.py` and `gray2stl.py` in `bin/`. It writes heightmap PNGs, STL files and a manifest into `HEXFORGE3D_OUTPUT_DIR`. The API uses `_publish_to_assets` to copy outputs into NGINX’s public assets directory. If the venv or scripts are missing, jobs return `ENGINE_NOT_READY`. Write permission on the host mount is required. |
| Heightmap Job Storage | Jobs are persisted into `/data/hexforge3d/jobs/heightmap` (uploads, meta and artifacts). Each job has its own directory and JSON metadata file. Without a persistent host volume this data disappears on container restart. |
| Surface Engine API | Resides in `hexforge-surface-engine`. FastAPI service under `/api/surface` with job creation and status routes. Uses environment variables `SURFACE_OUTPUT_DIR` (default `/data/hexforge3d/surface`) and `SURFACE_PUBLIC_PREFIX` (default `/assets/surface`). Generates job JSON and manifest and sets status based on existence of hero preview, texture, heightmap and STL. The container runs as non-root user 10001 and can write to the mounted host volume; volumes can be tightened further. |
| Docker Compose | Defines all services and mounts host directories. Notably, the assistant is privileged and mounts `/var/run/docker.sock` and an SSH key, while the surface engine is configured as a normal user and includes an optional `read_only` parameter (commented). Health checks for each service are defined. |
| CI / GitHub Actions | Diff report validation ensures PRs that include code changes also include a corresponding diff report file under `docs/diffs/`. This is effective for code review quality. |

## Critical Path Checklist to get Heightmap & Surface Engine usable

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
- Ensure the surface engine uses `SURFACE_OUTPUT_DIR=/data/hexforge3d/surface` and `SURFACE_PUBLIC_PREFIX=/assets/surface`.
- Both must match NGINX alias paths.

3) **Remove unnecessary privileges**
- Drop `privileged: true` and the `/var/run/docker.sock` mount from the assistant container.
- If the assistant needs to run Blender, mount only the GPU devices and necessary host resources with explicit read/write flags.
- Restrict capabilities to those required.

4) **Limit host volume access**
- For the surface engine, mount only `/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface` read-write and mount the rest read-only.
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
docker compose logs assistant surface-engine
curl -f http://localhost:11435/health
curl -f http://localhost:11435/api/heightmap/health
curl -f http://localhost:8092/api/surface/health

Verify engine files exist
ls -l /mnt/hdd-storage/ai-tools/engines/hexforge3d/venv/bin/python
ls -l /mnt/hdd-storage/ai-tools/engines/hexforge3d/bin/gray2heightmap.py
ls -l /mnt/hdd-storage/ai-tools/engines/hexforge3d/output
ls -l /mnt/hdd-storage/ai-tools/engines/hexforge3d/surface

Test heightmap job creation
curl -F "image=@test.png" -F "name=demo" \
  http://localhost:11435/api/heightmap/v1

# poll status:
curl http://localhost:11435/api/heightmap/jobs/<job_id>

ls -l /mnt/hdd-storage/ai-tools/engines/hexforge3d/output | tail -n5

Test surface job creation
curl -X POST -H "Content-Type: application/json" \
  -d '{"subfolder":"test","some":"param"}' \
  http://localhost:8092/api/surface/jobs

curl http://localhost:8092/api/surface/jobs/<job_id>
ls -l /mnt/hdd-storage/ai-tools/engines/hexforge3d/surface/<job_id>

Confirm permissions
stat -c '%U:%G %A' /mnt/hdd-storage/ai-tools/engines/hexforge3d/surface

Check assistant is no longer privileged / no docker.sock
docker inspect hexforge-assistant --format '{{.HostConfig.Privileged}}'
docker inspect hexforge-assistant --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}\n{{end}}'
```