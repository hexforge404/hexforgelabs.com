from __future__ import annotations

import asyncio
import datetime
import inspect
import json
import os
import uuid
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import JSONResponse

from assistant.tools.heightmap_engine import generate_relief
from assistant.tools.heightmap_jobs import (
    create_job,
    read_job,
    update_job,
    list_jobs,
    delete_job,
    UPLOADS,
)

router = APIRouter(prefix="/tool", tags=["tools"])


# --------------------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------------------
OUTPUT_DIR = Path(os.getenv("HEIGHTMAP_OUTPUT_DIR", "/data/hexforge3d/output"))
TMP_DIR = Path(os.getenv("HEIGHTMAP_TMP_DIR", "/tmp/hexforge-heightmap"))

# Optional engine readiness check
ENGINE_PYTHON = Path(os.getenv("HEIGHTMAP_ENGINE_PYTHON", "/data/hexforge3d/venv/bin/python"))


# --------------------------------------------------------------------------------------
# Worker: runs in a thread via asyncio.to_thread()
# --------------------------------------------------------------------------------------
def run_heightmap_job_sync(job_id: str, input_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
    try:
        update_job(job_id, status="running", progress=5)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        TMP_DIR.mkdir(parents=True, exist_ok=True)

        if not os.access(str(OUTPUT_DIR), os.W_OK):
            raise RuntimeError(f"Output directory not writable: {OUTPUT_DIR}")

        update_job(job_id, progress=15)

        safe_name = str(params["name"]).strip()
        mode = params.get("mode", "relief")
        max_height = float(params.get("max_height", 4.0))
        invert = bool(params.get("invert", True))
        size_mm = int(params.get("size_mm", 80))
        thickness = float(params.get("thickness", 2.0))

        kwargs = {
            "image_path": input_path,
            "name": safe_name,
            "size_mm": (size_mm, size_mm),
            "thickness": thickness,
            "relief": max_height,
            "invert": invert,
            # harmless if engine doesn't accept it; filtered below
            "mode": mode,
        }

        sig = inspect.signature(generate_relief)
        accepted = set(sig.parameters.keys())
        safe_kwargs = {k: v for k, v in kwargs.items() if k in accepted}

        update_job(job_id, progress=35, used_kwargs=safe_kwargs)

        # --- REAL GENERATOR ---
        result = generate_relief(**safe_kwargs)

        update_job(job_id, progress=85)

        payload = result if isinstance(result, dict) else {"output": str(result)}

        heightmap_file = payload.get("heightmap")
        stl_file = payload.get("stl")
        manifest_file = payload.get("manifest")

        # Ensure a consistent manifest exists
        if not manifest_file:
            manifest_file = f"{safe_name}_manifest.json"

        try:
            manifest_path = OUTPUT_DIR / Path(str(manifest_file)).name
            manifest_payload = {
                "ok": True,
                "job_id": job_id,
                "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
                "input_path": input_path,
                "params": {
                    "name": safe_name,
                    "mode": mode,
                    "max_height": max_height,
                    "invert": invert,
                    "size_mm": size_mm,
                    "thickness": thickness,
                },
                "result_raw": payload,
            }
            manifest_path.write_text(json.dumps(manifest_payload, indent=2), encoding="utf-8")
            manifest_file = str(manifest_path)
        except Exception as e:
            payload.setdefault("warnings", []).append(f"manifest_write_failed: {e}")

        output = {
            "heightmap": heightmap_file,
            "stl": stl_file,
            "manifest": manifest_file,
        }

        update_job(job_id, status="done", progress=100, result=output, result_raw=payload)
        return output

    except Exception as e:
        update_job(job_id, status="failed", error=str(e) or "failed")
        raise


# --------------------------------------------------------------------------------------
# API: Create job
# --------------------------------------------------------------------------------------
@router.post("/heightmap/v1")
async def heightmap_tool_v1(
    image: UploadFile = File(...),
    mode: str = Form("relief"),
    max_height: float = Form(4.0),
    invert: bool = Form(True),
    size_mm: int = Form(80),
    thickness: float = Form(2.0),
    name: str = Form("hexforge"),
):
    trace_id = uuid.uuid4().hex
    api_version = "v1"

    if not image.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    safe_name = (name or "").strip()
    if not safe_name:
        raise HTTPException(status_code=400, detail="name is required")

    TMP_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if ENGINE_PYTHON and not ENGINE_PYTHON.exists():
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "api_version": api_version,
                "trace_id": trace_id,
                "error": {"code": "ENGINE_NOT_READY", "message": f"Missing engine python at {ENGINE_PYTHON}"},
            },
        )

    if not os.access(str(OUTPUT_DIR), os.W_OK):
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "api_version": api_version,
                "trace_id": trace_id,
                "error": {"code": "OUTPUT_NOT_WRITABLE", "message": f"Output directory not writable: {OUTPUT_DIR}"},
            },
        )

    upload_filename = f"{safe_name}__{image.filename}".replace("/", "_")
    job = create_job(safe_name, upload_filename)

    input_path = UPLOADS / f"{job['id']}__{upload_filename}"
    content = await image.read()
    await image.close()

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file was empty")

    input_path.write_bytes(content)
    update_job(job["id"], status="queued", progress=1, bytes=len(content), filename=image.filename)

    params: Dict[str, Any] = {
        "name": safe_name,
        "mode": mode,
        "max_height": max_height,
        "invert": invert,
        "size_mm": size_mm,
        "thickness": thickness,
    }

    async def _runner():
        try:
            await asyncio.to_thread(run_heightmap_job_sync, job["id"], str(input_path), params)
        except Exception:
            pass

    asyncio.create_task(_runner())

    return JSONResponse(
        {
            "ok": True,
            "api_version": api_version,
            "trace_id": trace_id,
            "job_id": job["id"],
            "status_url": f"/tool/heightmap/jobs/{job['id']}",
        }
    )


# --------------------------------------------------------------------------------------
# API: Job status (polling)
# --------------------------------------------------------------------------------------
@router.get("/heightmap/jobs/{job_id}")
async def heightmap_job_status(job_id: str):
    job = read_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    return {"ok": True, "job": job}


# --------------------------------------------------------------------------------------
# API: List/Get/Delete for UI "Past Jobs"
# --------------------------------------------------------------------------------------
@router.get("/heightmap/v1/jobs")
def hm_list_jobs(
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return {"ok": True, "jobs": list_jobs(limit=limit, offset=offset)}


@router.get("/heightmap/v1/jobs/{job_id}")
def hm_get_job(job_id: str):
    job = read_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.pop("result_raw", None)
    return {"ok": True, "job": job}


@router.delete("/heightmap/v1/jobs/{job_id}")
def hm_delete_job(job_id: str):
    ok = delete_job(job_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}
