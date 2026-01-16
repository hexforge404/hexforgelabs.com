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


def _touch(path: Path, content: str = ""):  # placeholder writer
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _build_manifest(job_id: str, subfolder: Optional[str]) -> dict:
    subfolder_clean = _sanitize_subfolder(subfolder)

    base_url = f"{PUBLIC_PREFIX}/"
    base_fs = OUTPUT_BASE
    if subfolder_clean:
        base_url += f"{subfolder_clean}/"
        base_fs = base_fs / subfolder_clean

    public_root = f"{base_url}{job_id}/"
    job_root = base_fs / job_id

    # Paths
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

    # Write placeholder files
    _touch(job_root / "job.json", json.dumps({"job_id": job_id, "service": SERVICE_NAME}))
    _touch(job_root / "enclosure" / "enclosure.stl", "placeholder stl")
    _touch(job_root / "textures" / "texture.png", "texture placeholder")
    _touch(job_root / "textures" / "heightmap.png", "heightmap placeholder")
    for name, url in previews.items():
        _touch(job_root / "previews" / f"{name}.png", f"preview {name}")

    manifest = {
        "version": "v1",
        "job_id": job_id,
        "service": SERVICE_NAME,
        "updated_at": _iso_now(),
        "subfolder": subfolder_clean,
        "public_root": public_root,
        "public": {
            "job_json": job_json_url,
            "enclosure": {
                "stl": enclosure_stl_url,
            },
            "textures": {
                "texture_png": texture_png_url,
                "heightmap_png": heightmap_png_url,
            },
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
    JOBS[job_id] = {"status": "queued", "manifest": None}
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


@app.get("/health")
def health():
    return {"status": "ok", "service": SERVICE_NAME}
