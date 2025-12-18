from __future__ import annotations

import datetime
import inspect
import json
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from assistant.tools.heightmap_engine import generate_relief

router = APIRouter(tags=["tools"])


@router.post("/heightmap")
@router.post("/heightmap/v1")
async def heightmap_tool(
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

    tmp_dir = Path("/tmp/hexforge-heightmap")
    out_dir = Path("/data/hexforge3d/output")
    tmp_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)

    # --- engine readiness checks ---
    engine_python = Path("/data/hexforge3d/venv/bin/python")
    if not engine_python.exists():
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "api_version": api_version,
                "trace_id": trace_id,
                "error": {
                    "code": "ENGINE_NOT_READY",
                    "message": f"Missing engine python at {engine_python}",
                },
            },
        )

    if not os.access(str(out_dir), os.W_OK):
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "api_version": api_version,
                "trace_id": trace_id,
                "error": {
                    "code": "OUTPUT_NOT_WRITABLE",
                    "message": f"Output directory not writable: {out_dir}",
                },
            },
        )

    in_path = tmp_dir / image.filename

    content = await image.read()
    await image.close()

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file was empty")

    in_path.write_bytes(content)

    try:
        kwargs = {
            "image_path": str(in_path),
            "image": str(in_path),
            "input_path": str(in_path),
            "name": name,
            "size_mm": (size_mm, size_mm),
            "thickness": thickness,
            "relief": max_height,
            "max_height": max_height,
            "invert": invert,
            "mode": mode,
            "output_dir": str(out_dir),
            "out_dir": str(out_dir),
            "out_path": str(out_dir),
            "output_path": str(out_dir),
        }

        sig = inspect.signature(generate_relief)
        accepted = set(sig.parameters.keys())
        safe_kwargs = {k: v for k, v in kwargs.items() if k in accepted}

        result = generate_relief(**safe_kwargs)

        # Normalize output
        if isinstance(result, dict):
            payload = result
        elif isinstance(result, (list, tuple)):
            payload = {"outputs": [str(x) for x in result]}
        else:
            payload = {"output": str(result)}

        response_obj = {
            "ok": True,
            "api_version": api_version,
            "trace_id": trace_id,
            "received": {
                "filename": image.filename,
                "bytes": len(content),
                "mode": mode,
                "max_height": max_height,
                "invert": invert,
                "size_mm": size_mm,
                "thickness": thickness,
                "name": name,
            },
            "used_kwargs": safe_kwargs,
            "result": payload,
        }

        # ---- write manifest (never crash request) ----
        try:
            manifest_path = out_dir / f"{name}_manifest.json"
            manifest_payload = {
                **response_obj,
                "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
            }
            manifest_path.write_text(
                json.dumps(manifest_payload, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as e:
            response_obj.setdefault("warnings", []).append(f"manifest_write_failed: {e}")

        return JSONResponse(response_obj)

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "api_version": api_version,
                "trace_id": trace_id,
                "error": {
                    "code": "HEIGHTMAP_FAILED",
                    "message": str(e),
                },
            },
        )
