from __future__ import annotations

import inspect
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from assistant.tools.heightmap_engine import generate_relief  # your existing pipeline

router = APIRouter(tags=["tools"])


@router.post("/heightmap")
async def heightmap_tool(
    image: UploadFile = File(...),
    mode: str = Form("relief"),          # "relief" | "heightmap" (whatever you support)
    max_height: float = Form(4.0),       # aka relief height in mm
    invert: bool = Form(True),
    size_mm: int = Form(80),             # square output, 80mm default
    thickness: float = Form(2.0),        # base thickness in mm
    name: str = Form("hexforge"),        # output name prefix
):
    # ---- basic validation ----
    if not image.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    tmp_dir = Path("/tmp/hexforge-heightmap")
    out_dir = tmp_dir / "output"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)

    in_path = tmp_dir / image.filename

    content = await image.read()
    await image.close()

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file was empty")

    in_path.write_bytes(content)

    try:
        # ---- CALL YOUR REAL PIPELINE (signature-safe) ----
        kwargs = {
            "image_path": str(in_path),
            "image": str(in_path),              # some implementations use `image`
            "input_path": str(in_path),         # or `input_path`
            "name": name,
            "size_mm": (size_mm, size_mm),
            "thickness": thickness,
            "relief": max_height,
            "max_height": max_height,           # some use `max_height`
            "invert": invert,
            "mode": mode,
            "output_dir": str(out_dir),         # common alt name
            "out_dir": str(out_dir),            # the one that caused your crash earlier
            "out_path": str(out_dir),           # sometimes used as dir/prefix
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

        return JSONResponse(
            {
                "ok": True,
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
                "used_kwargs": safe_kwargs,  # 🔥 super useful while debugging
                "result": payload,
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Heightmap generation failed: {e}")
