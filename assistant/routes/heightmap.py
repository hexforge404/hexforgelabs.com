from __future__ import annotations

import asyncio
import datetime
import inspect
import json
import os
import re
import shutil
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, Query
from fastapi.responses import JSONResponse

from assistant.tools.heightmap_engine import generate_relief
from assistant.tools.heightmap_jobs import (
    ARTIFACTS,
    BASE,
    JOBS,
    UPLOADS,
    create_job,
    delete_job,
    list_jobs,
    read_job,
    update_job,
)
from assistant.tools.render_previews import render_stl_previews

# assistant/routes/heightmap.py
router = APIRouter(prefix="/heightmap", tags=["heightmap"])
HEIGHTMAP_API_KEY = os.getenv("HEIGHTMAP_API_KEY", "").strip()





# --------------------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------------------
# NGINX must map something like:
#   location ^~ /assets/heightmap/ { alias /var/www/hexforge3d/output/; }
#
# docker-compose volume:
#   /mnt/hdd-storage/ai-tools/engines/hexforge3d:/var/www/hexforge3d
#
# Assistant container sees the same host path at:
#   /mnt/hdd-storage/ai-tools/engines/hexforge3d -> /data/hexforge3d
OUTPUT_DIR = Path(os.getenv("HEIGHTMAP_OUTPUT_DIR", "/data/hexforge3d/output"))
TMP_DIR = Path(os.getenv("HEIGHTMAP_TMP_DIR", "/tmp/hexforge-heightmap"))
ENGINE_PYTHON = Path(os.getenv("HEIGHTMAP_ENGINE_PYTHON", "/data/hexforge3d/venv/bin/python"))
PUBLIC_ASSETS_PREFIX = os.getenv("HEIGHTMAP_PUBLIC_PREFIX", "/assets/heightmap")


def require_heightmap_api_key(request: Request):
    """
    Optional API-key enforcement. If HEIGHTMAP_API_KEY is empty, allow traffic.
    Accepts header X-API-Key or query param api_key for local/dev friendliness.
    """
    if not HEIGHTMAP_API_KEY:
        return None

    supplied = (
        request.headers.get("x-api-key")
        or request.headers.get("x-api_key")
        or request.query_params.get("api_key")
    )

    if supplied != HEIGHTMAP_API_KEY:
        raise HTTPException(status_code=403, detail="heightmap API key invalid or missing")

    return None


router.dependencies.append(Depends(require_heightmap_api_key))




def _slug(s: str) -> str:
    """
    Filename-safe slug. Keeps alnum, dash, underscore.
    """
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_\-]+", "", s)
    return s or "hexforge"


def _to_bool(v: Any, default: bool = True) -> bool:
    """
    Safe bool coercion for params that might be bool/str/int.
    """
    if v is None:
        return default
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    if isinstance(v, str):
        s = v.strip().lower()
        if s in {"1", "true", "yes", "y", "on"}:
            return True
        if s in {"0", "false", "no", "n", "off"}:
            return False
    return default


def _publish_to_assets(src_path: str | Path, out_name: str) -> dict[str, str]:
    """
    Copy file into OUTPUT_DIR with the given filename.

    Returns:
      {
        "engine_path": "/data/hexforge3d/output/<file>",
        "url": "/assets/heightmap/<file>"
      }
    """
    src = Path(src_path)
    if not src.exists():
        raise RuntimeError(f"Source missing: {src}")
    if src.is_symlink():
        raise RuntimeError(f"Refusing to publish symlink: {src}")

    output_root = OUTPUT_DIR.resolve()
    if OUTPUT_DIR.exists() and OUTPUT_DIR.is_symlink():
        raise RuntimeError(f"Refusing to write to symlinked output dir: {OUTPUT_DIR}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Keep filenames local-only and ensure the resolved destination stays under OUTPUT_DIR
    safe_name = Path(out_name).name
    dst = (OUTPUT_DIR / safe_name).resolve()
    if output_root not in dst.parents and dst != output_root:
        raise RuntimeError(f"Invalid destination outside OUTPUT_DIR: {dst}")

    shutil.copy2(src, dst)
    return {"engine_path": str(dst), "url": f"{PUBLIC_ASSETS_PREFIX}/{safe_name}"}


def _engine_health_status() -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    paths = {
        "output_dir": OUTPUT_DIR,
        "tmp_dir": TMP_DIR,
        "jobs_base": BASE,
        "uploads_dir": UPLOADS,
        "jobs_meta_dir": JOBS,
        "artifacts_dir": ARTIFACTS,
    }

    for label, path in paths.items():
        if not path.exists():
            errors.append(f"{label}_missing:{path}")
            continue
        if not path.is_dir():
            errors.append(f"{label}_not_dir:{path}")
            continue
        if not os.access(path, os.W_OK):
            errors.append(f"{label}_not_writable:{path}")

    if ENGINE_PYTHON:
        if not ENGINE_PYTHON.exists():
            errors.append(f"engine_python_missing:{ENGINE_PYTHON}")
        elif not os.access(ENGINE_PYTHON, os.X_OK):
            errors.append(f"engine_python_not_executable:{ENGINE_PYTHON}")

    return {
        "ok": not errors,
        "service": "heightmap",
        "api": "heightmap-v1",
        "errors": errors,
        "warnings": warnings,
    }


# --------------------------------------------------------------------------------------
# Worker: runs in a thread via asyncio.to_thread()
# --------------------------------------------------------------------------------------
def run_heightmap_job_sync(job_id: str, input_path: str, params: dict[str, Any]) -> dict[str, Any]:
    try:
        update_job(job_id, status="running", progress=5)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        TMP_DIR.mkdir(parents=True, exist_ok=True)

        if not os.access(str(OUTPUT_DIR), os.W_OK):
            raise RuntimeError(f"Output directory not writable: {OUTPUT_DIR}")

        update_job(job_id, progress=15)

        name_raw = str(params.get("name", "hexforge")).strip()
        safe_name = _slug(name_raw)

        mode = str(params.get("mode", "relief")).strip() or "relief"
        max_height = float(params.get("max_height", 4.0))
        invert = _to_bool(params.get("invert", True), default=True)
        size_mm = int(params.get("size_mm", 80))
        thickness = float(params.get("thickness", 2.0))

        kwargs = {
            "image_path": input_path,
            "name": safe_name,
            "size_mm": (size_mm, size_mm),
            "thickness": thickness,
            "relief": max_height,
            "invert": invert,
            "mode": mode,  # filtered below if engine doesn't accept it
        }

        sig = inspect.signature(generate_relief)
        accepted = set(sig.parameters.keys())
        safe_kwargs = {k: v for k, v in kwargs.items() if k in accepted}

        update_job(job_id, progress=35, used_kwargs=safe_kwargs)

        # --- REAL GENERATOR ---
        result = generate_relief(**safe_kwargs)

        update_job(job_id, progress=80)

        payload: dict[str, Any] = result if isinstance(result, dict) else {"output": str(result)}

        # Engine paths (may be job-local or elsewhere)
        heightmap_file = payload.get("heightmap")
        stl_file = payload.get("stl")
        manifest_file = payload.get("manifest")  # engine-generated manifest (optional)

        # -----------------------------
        # Job-local output directory
        # -----------------------------
        job_obj = read_job(job_id) or {}
        jobs_base = Path(os.getenv("HEIGHTMAP_JOBS_DIR", "/data/hexforge3d/jobs/heightmap"))
        job_dir = Path(
            job_obj.get("job_dir")
            or job_obj.get("dir")
            or job_obj.get("path")
            or (jobs_base / job_id)
        )

        out_dir = job_dir / "outputs"
        previews_dir = out_dir / "previews"
        out_dir.mkdir(parents=True, exist_ok=True)
        previews_dir.mkdir(parents=True, exist_ok=True)

        # -----------------------------
        # Copy engine outputs into job folder (colocated per job)
        # -----------------------------
        heightmap_local: str | None = None
        stl_local: str | None = None
        engine_manifest_local: str | None = None

        try:
            if heightmap_file and Path(str(heightmap_file)).exists():
                src = Path(str(heightmap_file))
                dst = out_dir / src.name
                shutil.copy2(src, dst)
                heightmap_local = str(dst)

            if stl_file and Path(str(stl_file)).exists():
                src = Path(str(stl_file))
                dst = out_dir / src.name
                shutil.copy2(src, dst)
                stl_local = str(dst)

            if manifest_file and Path(str(manifest_file)).exists():
                src = Path(str(manifest_file))
                dst = out_dir / src.name
                shutil.copy2(src, dst)
                engine_manifest_local = str(dst)

        except Exception as e:
            payload.setdefault("warnings", []).append(f"output_copy_failed: {e}")

        # -----------------------------
        # Blender previews (best effort)
        # -----------------------------
        blender_status = "skipped"
        blender_previews_job_local: dict[str, str] = {}
        blender_previews_manifest_job_local: str | None = None

        published_previews: dict[str, dict[str, str]] = {}  # key -> {engine_path,url}
        published_preview_urls: dict[str, str] = {}          # key -> url
        published_preview_manifest: dict[str, str] | None = None

        try:
            if stl_local and Path(stl_local).exists():
                blender_status = "running"
                previews_res = render_stl_previews(stl_local, str(previews_dir), size=900)

                blender_previews_job_local = previews_res.get("files") or {}
                blender_previews_manifest_job_local = previews_res.get("previews_json") or None
                blender_status = "ok" if previews_res.get("ok") else "failed"

                # Publish previews to OUTPUT_DIR so nginx can serve them
                if blender_status == "ok":
                    base = f"{safe_name}__{job_id}"

                    for key, p in blender_previews_job_local.items():
                        pp = Path(p)
                        if pp.exists():
                            pub = _publish_to_assets(pp, f"{base}__{key}.png")
                            published_previews[key] = pub
                            published_preview_urls[key] = pub["url"]

                    if blender_previews_manifest_job_local:
                        mf = Path(blender_previews_manifest_job_local)
                        if mf.exists():
                            published_preview_manifest = _publish_to_assets(mf, f"{base}__previews.json")

                else:
                    err = (previews_res.get("stderr") or previews_res.get("stdout") or "").strip()
                    payload.setdefault("warnings", []).append("blender_previews_failed")
                    payload["blender_previews_error"] = err[-2000:] if err else "unknown_error"

        except Exception as e:
            blender_status = "failed"
            payload.setdefault("warnings", []).append("blender_previews_exception")
            payload["blender_previews_error"] = f"exception: {e}"

        # -----------------------------
        # Publish the primary outputs too (png/stl/engine manifest)
        # -----------------------------
        published_main: dict[str, dict[str, str]] = {}
        published_main_urls: dict[str, str] = {}

        try:
            base = f"{safe_name}__{job_id}"

            if heightmap_local and Path(heightmap_local).exists():
                pub = _publish_to_assets(Path(heightmap_local), f"{base}__heightmap.png")
                published_main["heightmap"] = pub
                published_main_urls["heightmap"] = pub["url"]

            if stl_local and Path(stl_local).exists():
                pub = _publish_to_assets(Path(stl_local), f"{base}__relief.stl")
                published_main["stl"] = pub
                published_main_urls["stl"] = pub["url"]

            if engine_manifest_local and Path(engine_manifest_local).exists():
                pub = _publish_to_assets(Path(engine_manifest_local), f"{base}__engine_manifest.json")
                published_main["engine_manifest"] = pub
                published_main_urls["engine_manifest"] = pub["url"]

        except Exception as e:
            payload.setdefault("warnings", []).append(f"publish_main_failed: {e}")

        # -----------------------------
        # Write a job-local manifest (ours)
        # -----------------------------
        job_manifest_path = out_dir / f"{safe_name}__job_manifest.json"
        try:
            manifest_payload = {
                "schema": "hexforge.heightmap.job-manifest.v1",
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
                "outputs": {
                    # job-local files
                    "heightmap_job_local": heightmap_local or heightmap_file,
                    "stl_job_local": stl_local or stl_file,
                    "engine_manifest_job_local": engine_manifest_local or manifest_file,

                    # previews job-local
                    "blender_previews_job_local": blender_previews_job_local,
                    "blender_previews_manifest_job_local": blender_previews_manifest_job_local,
                    "blender_previews_status": blender_status,

                    # published assets (public)
                    "published": published_main,
                    "published_urls": published_main_urls,
                    "published_blender_previews": published_previews,
                    "published_blender_preview_urls": published_preview_urls,
                    "published_blender_previews_manifest": published_preview_manifest,
                    "published_blender_previews_manifest_url": (
                        published_preview_manifest["url"] if published_preview_manifest else None
                    ),
                },
                "result_raw": payload,
            }
            job_manifest_path.write_text(json.dumps(manifest_payload, indent=2), encoding="utf-8")
        except Exception as e:
            payload.setdefault("warnings", []).append(f"job_manifest_write_failed: {e}")

        # publish our job manifest too (so UI can download it cleanly)
        published_job_manifest: str | None = None
        published_job_manifest_url: str | None = None
        try:
            base = f"{safe_name}__{job_id}"
            pub = _publish_to_assets(job_manifest_path, f"{base}__job_manifest.json")
            published_job_manifest = pub["engine_path"]
            published_job_manifest_url = pub["url"]
        except Exception as e:
            payload.setdefault("warnings", []).append(f"publish_job_manifest_failed: {e}")

        update_job(job_id, progress=95)

        # -----------------------------
        # Final output returned to UI
        # -----------------------------
        output: dict[str, Any] = {
            # job-local (debug / internal)
            "heightmap": heightmap_local or heightmap_file,
            "stl": stl_local or stl_file,
            "manifest": str(job_manifest_path),

            # published (what the UI SHOULD use)
            "public": {
                "heightmap_url": published_main_urls.get("heightmap"),
                "stl_url": published_main_urls.get("stl"),
                "engine_manifest_url": published_main_urls.get("engine_manifest"),
                "job_manifest_url": published_job_manifest_url,
                "blender_previews_urls": published_preview_urls,
                "blender_previews_manifest_url": (
                    published_preview_manifest["url"] if published_preview_manifest else None
                ),
            },

            # keep these too (useful for debugging)
            "published_engine_paths": {
                "heightmap": published_main.get("heightmap", {}).get("engine_path"),
                "stl": published_main.get("stl", {}).get("engine_path"),
                "engine_manifest": published_main.get("engine_manifest", {}).get("engine_path"),
                "job_manifest": published_job_manifest,
                "blender_previews": {k: v.get("engine_path") for k, v in published_previews.items()},
                "blender_previews_manifest": (
                    published_preview_manifest["engine_path"] if published_preview_manifest else None
                ),
            },

            "blender_previews_status": blender_status,
        }

        update_job(job_id, status="done", progress=100, result=output, result_raw=payload)
        return output

    except Exception as e:
        update_job(job_id, status="failed", error=str(e) or "failed")
        raise


# --------------------------------------------------------------------------------------
# API: Create job
# --------------------------------------------------------------------------------------
@router.post("/v1")
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

    health = _engine_health_status()
    if not health["ok"]:
        health["trace_id"] = trace_id
        return JSONResponse(status_code=503, content=health)

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

    params: dict[str, Any] = {
        "name": safe_name,
        "mode": mode,
        "max_height": max_height,
        "invert": invert,
        "size_mm": size_mm,
        "thickness": thickness,
    }

    async def _runner() -> None:
        try:
            await asyncio.to_thread(run_heightmap_job_sync, job["id"], str(input_path), params)
        except Exception:
            # job is already marked failed in the worker
            pass

    asyncio.create_task(_runner())

    return JSONResponse(
        {
            "ok": True,
            "api_version": api_version,
            "trace_id": trace_id,
            "job_id": job["id"],
            "status_url": f"/api/heightmap/jobs/{job['id']}",
            "status_url_tool": f"/tool/heightmap/jobs/{job['id']}",
        }
    )


# --------------------------------------------------------------------------------------
# API: Job status (polling)
# --------------------------------------------------------------------------------------
@router.get("/jobs/{job_id}")
async def heightmap_job_status(job_id: str):
    job = read_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    return {"ok": True, "job": job}


# --------------------------------------------------------------------------------------
# API: List/Get/Delete for UI "Past Jobs"
# --------------------------------------------------------------------------------------
@router.get("/v1/jobs")
def hm_list_jobs(
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return {"ok": True, "jobs": list_jobs(limit=limit, offset=offset)}


@router.get("/v1/jobs/{job_id}")
def hm_get_job(job_id: str):
    job = read_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.pop("result_raw", None)
    return {"ok": True, "job": job}


@router.delete("/v1/jobs/{job_id}")
def hm_delete_job(job_id: str):
    ok = delete_job(job_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}

@router.get("/health")
def health():
    status = _engine_health_status()
    code = 200 if status["ok"] else 503
    return JSONResponse(status_code=code, content=status)
