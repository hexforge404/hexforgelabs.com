# Surface Contract Drift Report (2026-01-29)

## Context
- Stack: local docker compose via `docker compose up -d --build`
- BASE_URL: `http://localhost:8088`
- Surface job generated via `scripts/run_surface_from_latest_heightmap.sh`
- Heightmap job used: `1c247d2e67a4493993d3c5b46a238b6f`
- Surface job observed: `154c00a982359138` (subfolder `smoke-test`)
- Public root reported: `/assets/surface/smoke-test/154c00a982359138`

## Contract vs Observed
- Manifest file
  - Expected (contract): `job.json` (with optional `previews.json`)
  - Observed: `job_manifest.json` **and** `job.json` present; no `previews.json`
  - Manifest URL tested: `http://localhost:8088/assets/surface/smoke-test/154c00a982359138/job_manifest.json` (200)
- STL location
  - Expected (contract): `enclosure/enclosure.stl`
  - Observed: `enclosure/enclosure.stl` (present, 200)
  - Script fallback currently prints `/product.stl` even though no `product.stl` exists
- Previews
  - Expected: `previews/hero.png` under public root
  - Observed: `previews/hero.png` (present, 200) plus `iso.png`, `top.png`, `side.png`
- Texture/heightmap copies
  - Observed: `textures/texture.png`, `textures/heightmap.png`
- Inputs
  - Observed: `inputs/input_heightmap.png`

## Evidence (filesystem)
```
/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface/smoke-test/154c00a982359138/enclosure/enclosure.stl
/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface/smoke-test/154c00a982359138/job.json
/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface/smoke-test/154c00a982359138/job_manifest.json
/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface/smoke-test/154c00a982359138/previews/{hero,iso,top,side}.png
/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface/smoke-test/154c00a982359138/textures/{texture,heightmap}.png
/mnt/hdd-storage/ai-tools/engines/hexforge3d/surface/smoke-test/154c00a982359138/inputs/input_heightmap.png
```

## Manifest snapshot (key paths)
- `public_root`: `/assets/surface/smoke-test/154c00a982359138`
- `public.enclosure.stl`: `/assets/surface/smoke-test/154c00a982359138/enclosure/enclosure.stl`
- `public.previews.hero`: `/assets/surface/smoke-test/154c00a982359138/previews/hero.png`
- `outputs` contains entries for manifest, job.json, previews, STL, textures, input heightmap (with checksums)

## Compatibility notes
- Clients must accept either `job_manifest.json` or `job.json` as the manifest source.
- STL should be read from manifest/public outputs; if missing, try `/enclosure/enclosure.stl`, then `/product.stl` as legacy fallback.
- No `previews.json` is currently written; previews are individual PNGs under `previews/`.

## PASS proof (2026-01-29)
- Job: `26d596118dc0afd0` (subfolder `smoke-test`)
- Manifest: http://localhost:8088/assets/surface/smoke-test/26d596118dc0afd0/job_manifest.json (HEAD 200)
- Hero: http://localhost:8088/assets/surface/smoke-test/26d596118dc0afd0/previews/hero.png (HEAD 200)
- STL: http://localhost:8088/assets/surface/smoke-test/26d596118dc0afd0/enclosure/enclosure.stl (HEAD 200)
