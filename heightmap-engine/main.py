import json
import os
import re
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageFilter, ImageOps

app = FastAPI(title="HexForge Heightmap Engine", version="1.0.0")

OUTPUT_BASE = Path(os.getenv("HEIGHTMAP_OUTPUT_DIR", "/data/hexforge3d/output/heightmap"))
PUBLIC_PREFIX = os.getenv("HEIGHTMAP_PUBLIC_PREFIX", "/assets/heightmap")
SERVICE_NAME = os.getenv("HEIGHTMAP_SERVICE_NAME", "heightmapengine")

JOBS = {}


class CreateJobRequest(BaseModel):
    name: Optional[str] = "heightmap"
    subfolder: Optional[str] = None


def _iso_now():
    return datetime.utcnow().isoformat() + "Z"


def _sanitize_subfolder(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    value = value.strip()
    if not value:
        return None
    if re.match(r"^[A-Za-z0-9_-]+$", value):
        return value
    return None


def _ensure_dirs(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def _write_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _write_enclosure(job_root: Path):
    enclosure = job_root / "enclosure" / "enclosure.stl"
    enclosure.parent.mkdir(parents=True, exist_ok=True)
    enclosure.write_text("solid heightmap\nendsolid heightmap\n", encoding="utf-8")


def _generate_image_assets(job_root: Path):
    textures_dir = job_root / "textures"
    previews_dir = job_root / "previews"
    _ensure_dirs(textures_dir)
    _ensure_dirs(previews_dir)

    size = (512, 512)

    base = Image.linear_gradient("L").resize(size)
    noise = Image.effect_noise(size, 18).convert("L")
    heightmap = Image.blend(base, noise, 0.35)
    heightmap = ImageOps.autocontrast(heightmap)
    heightmap.save(textures_dir / "heightmap.png", format="PNG")

    texture = ImageOps.colorize(heightmap, black="#1c2530", white="#8fc7ff")
    texture.save(textures_dir / "texture.png", format="PNG")

    hero = texture.copy()
    ImageDraw.Draw(hero).rectangle([0, 0, hero.width, hero.height], outline="#00bcd4", width=6)
    hero.save(previews_dir / "hero.png", format="PNG")

    iso = texture.rotate(15, expand=True, fillcolor="#0f1722").filter(ImageFilter.GaussianBlur(1))
    iso = iso.resize((640, 640))
    iso.save(previews_dir / "iso.png", format="PNG")

    top = texture.resize((640, 640))
    top.save(previews_dir / "top.png", format="PNG")

    side = ImageOps.flip(texture).resize((640, 400))
    side.save(previews_dir / "side.png", format="PNG")


def _build_manifest(job_id: str, subfolder: Optional[str]) -> dict:
    subfolder_clean = _sanitize_subfolder(subfolder)

    base_url = f"{PUBLIC_PREFIX}/"
    base_fs = OUTPUT_BASE
    if subfolder_clean:
        base_url += f"{subfolder_clean}/"
        base_fs = base_fs / subfolder_clean

    public_root = f"{base_url}{job_id}/"
    job_root = base_fs / job_id

    if job_root.exists():
        shutil.rmtree(job_root)
    _ensure_dirs(job_root)

    _write_json(job_root / "job.json", {"job_id": job_id, "service": SERVICE_NAME, "generated_at": _iso_now()})
    _write_enclosure(job_root)
    _generate_image_assets(job_root)

    job_json_url = f"{public_root}job.json"
    enclosure_stl_url = f"{public_root}enclosure/enclosure.stl"
    texture_png_url = f"{public_root}textures/texture.png"
    heightmap_png_url = f"{public_root}textures/heightmap.png"
    previews = {
        "hero": f"{public_root}previews/hero.png",
        "iso": f"{public_root}previews/iso.png",
        "top": f"{public_root}previews/top.png",
        "side": f"{public_root}previews/side.png",
    }

    manifest = {
        "version": "v1",
        "job_id": job_id,
        "service": SERVICE_NAME,
        "updated_at": _iso_now(),
        "subfolder": subfolder_clean,
        "public_root": public_root,
        "public": {
            "job_json": job_json_url,
            "enclosure": {"stl": enclosure_stl_url},
            "textures": {"texture_png": texture_png_url, "heightmap_png": heightmap_png_url},
            "heightmap_url": heightmap_png_url,
            "previews": previews,
        },
    }
    return manifest


def _status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return None
    return {
        "job_id": job_id,
        "status": job["status"],
        "service": SERVICE_NAME,
        "updated_at": _iso_now(),
        **({"result": {"public": job["manifest"]["public"]}} if job.get("status") == "complete" else {}),
    }


def _run_job(job_id: str, subfolder: Optional[str]):
    try:
        manifest = _build_manifest(job_id, subfolder)
        JOBS[job_id]["manifest"] = manifest
        JOBS[job_id]["status"] = "complete"
    except Exception as e:
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["error"] = str(e)


@app.post("/api/heightmap/jobs")
def create_job(body: CreateJobRequest, background_tasks: BackgroundTasks):
    job_id = uuid.uuid4().hex
    JOBS[job_id] = {"status": "queued", "manifest": None, "created_at": _iso_now()}
    background_tasks.add_task(_run_job, job_id, body.subfolder)
    return _status(job_id)


@app.get("/api/heightmap/jobs/{job_id}")
def get_job(job_id: str):
    job = _status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    return job


@app.get("/api/heightmap/jobs/{job_id}/assets")
def get_assets(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    if not job.get("manifest"):
        raise HTTPException(status_code=404, detail="manifest not ready")
    return job["manifest"]


@app.get("/api/heightmap/v1/jobs")
def list_jobs(limit: int = 25, offset: int = 0):
    limit = max(1, min(limit, 50))
    offset = max(offset, 0)

    items = []
    for job_id, job in reversed(list(JOBS.items())):
        manifest = job.get("manifest") or {}
        public = manifest.get("public") or {}
        heightmap_url = public.get("heightmap_url") or (public.get("textures") or {}).get("heightmap_png")

        items.append(
            {
                "id": job_id,
                "status": job.get("status"),
                "created_at": job.get("created_at"),
                "public": {
                    **public,
                    "heightmap_url": heightmap_url,
                },
            }
        )

    slice_items = items[offset : offset + limit]
    return {"jobs": {"items": slice_items, "count": len(items)}}


@app.get("/health")
def health():
    return {"status": "ok", "service": SERVICE_NAME}
