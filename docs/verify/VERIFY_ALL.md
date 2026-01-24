# HexForge Engines Verification

Follow these steps to validate the engines stack after deployment. Commands assume the repo root and docker-compose stack are available on the host.

## 1) Environment prep

```bash
# Optional API keys (leave empty for dev-friendly mode)
export HEIGHTMAP_API_KEY="<set-or-leave-empty>"
export SURFACE_API_KEY="<set-or-leave-empty>"
export SURFACE_DEFAULT_SUBFOLDER="smoke-test"  # default folder used by surface jobs

# Prepare storage (idempotent; run as root/sudo)
./scripts/hexforge3d_storage_init.sh
```

## 2) Bring services online

```bash
# Rebuild/restart services after config changes
docker compose up -d --build
```

Expect all containers healthy (`docker compose ps`). Surface processing depends on the `surface-engine-worker` service; it should report `healthy` once the heartbeat file is written.

## 3) Health checks

```bash
# Assistant health (fails fast if engine dirs/scripts missing)
curl -s http://localhost:11435/health | jq

# Heightmap API health (through nginx)
curl -sk -H "x-api-key: ${HEIGHTMAP_API_KEY}" https://localhost/api/heightmap/health | jq

# Surface API health (nginx -> backend proxy -> surface engine)
curl -sk -H "x-api-key: ${SURFACE_API_KEY}" https://localhost/api/surface/health | jq
```

Expected: `ok: true` for heightmap, `ok: true` or engine-specific status for surface. Non-zero errors indicate missing dirs/venv or blocked permissions.

## 4) Heightmap job happy path

```bash
IMG=/path/to/test-heightmap.png  # provide a real grayscale source image

# Submit job
auth_hdr="-H x-api-key:${HEIGHTMAP_API_KEY}"  # omit if key unset
curl -sk ${auth_hdr} \
  -F "image=@${IMG}" \
  -F "name=demo" \
  https://localhost/api/heightmap/v1 | jq
# -> capture job_id and status_url

# Poll status
JOB_ID=<returned-job-id>
curl -sk ${auth_hdr} "https://localhost/api/heightmap/jobs/${JOB_ID}" | jq
```

Expected: creation returns `ok: true` with URLs; status eventually shows `status: "done"` and `public.heightmap_url`/`stl_url` populated.

## 5) Surface job smoke

```bash
SURF_AUTH="-H x-api-key:${SURFACE_API_KEY}"

# Submit a surface job payload (example payload only)
curl -sk ${SURF_AUTH} -H "Content-Type: application/json" \
  -d '{"source":"/assets/surface/demo.obj","subfolder":"'"'"${SURFACE_DEFAULT_SUBFOLDER}'"'""}' \
  https://localhost/api/surface/jobs | jq

# Poll status
JOB_ID=<returned-job-id>
curl -sk ${SURF_AUTH} "https://localhost/api/surface/jobs/${JOB_ID}?subfolder=${SURFACE_DEFAULT_SUBFOLDER}" | jq
```

Expected: status moves from `queued` to `complete` within a few seconds (worker writes placeholder outputs). Manifest and job URLs should resolve under `/assets/surface/${SURFACE_DEFAULT_SUBFOLDER}/${JOB_ID}/...`; errors show `ok: false` with upstream detail.

## 6) Rate limit + auth guards

```bash
# Heightmap rate-limit sample (expect some 429s if burst >15 req/s)
for i in {1..20}; do curl -sk -o /dev/null -w "[%{time_total}s] %{http_code}\n" https://localhost/api/heightmap/health; done

# Docker tools should be gated by default (403)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:11435/tool/docker
```

If API keys are set, missing/invalid keys should return 403 for both heightmap and surface paths.
