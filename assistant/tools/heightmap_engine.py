import os
import json
import time
import platform
import subprocess
from pathlib import Path
from typing import Tuple, Dict, Any, Optional 
from assistant.tools.render_previews import render_stl_previews


ENGINE_DIR = Path(os.getenv("HEXFORGE3D_ENGINE_DIR", "/data/hexforge3d"))
PY = ENGINE_DIR / "venv" / "bin" / "python"

INPUT  = Path(os.getenv("HEXFORGE3D_INPUT_DIR",  str(ENGINE_DIR / "input")))
OUTPUT = Path(os.getenv("HEXFORGE3D_OUTPUT_DIR", str(ENGINE_DIR / "output")))


ENGINE_VERSION = os.getenv("HEXFORGE3D_ENGINE_VERSION", "hexforge3d@v1")


def _run(cmd, cwd: str) -> str:
    # capture output so FastAPI can return useful errors
    p = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(cmd)}\n\nSTDOUT:\n{p.stdout}\n\nSTDERR:\n{p.stderr}"
        )
    return p.stdout


def _iso_utc(ts: Optional[float] = None) -> str:
    ts = ts if ts is not None else time.time()
    # ISO-ish UTC without microseconds
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts))


def _safe_json_dump(path: Path, data: Dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")


def generate_relief(
    image_path: str,
    name: str = "asset",
    size_mm: Tuple[float, float] = (80, 80),
    thickness: float = 2.0,
    relief: float = 3.0,
    invert: bool = True,
    preview: bool = True,
) -> Dict[str, Any]:
    """
    Generates:
      - heightmap PNG
      - relief STL
      - optional preview renders (iso/top/front) if your pipeline produces them
      - manifest JSON describing all outputs
    """
    INPUT.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)

    # Normalize name a bit (avoid spaces ruining filenames)
    safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in name).strip("_") or "asset"

    # Copy input image into engine input folder
    img_dst = INPUT / f"{safe_name}.png"
    img_dst.write_bytes(Path(image_path).read_bytes())

    # Outputs
    hm = OUTPUT / f"{safe_name}_hm.png"
    stl = OUTPUT / f"{safe_name}_relief.stl"
    manifest_path = OUTPUT / f"{safe_name}_manifest.json"

    # 1) Heightmap
    cmd_hm = [
        str(PY), "bin/gray2heightmap.py",
        str(img_dst),
        "-o", str(hm),
        "--autocontrast",
        "--max-px", "1024",
    ]
    if invert:
        cmd_hm.append("--invert")
    _run(cmd_hm, cwd=str(ENGINE_DIR))

    # 2) STL
    cmd_stl = [
        str(PY), "bin/gray2stl.py",
        str(img_dst),
        "-o", str(stl),
        "--size-mm", f"{size_mm[0]},{size_mm[1]}",
        "--thickness", str(thickness),
        "--relief", str(relief),
        "--autocontrast",
        "--max-px", "512",
    ]
    if invert:
        cmd_stl.append("--invert")
    _run(cmd_stl, cwd=str(ENGINE_DIR))

    # 3) Preview files (expected naming convention from your current results)
    previews: Dict[str, str] = {}
    if preview:
        iso = OUTPUT / f"{safe_name}_preview_iso.png"
        top = OUTPUT / f"{safe_name}_preview_top.png"
        front = OUTPUT / f"{safe_name}_preview_front.png"

        # Only include if they actually exist (keeps it robust)
        if iso.exists():
            previews["iso"] = str(iso)
        if top.exists():
            previews["top"] = str(top)
        if front.exists():
            previews["front"] = str(front)

    # 4) Manifest
    created_utc = _iso_utc()
    dims_xyz = [float(size_mm[0]), float(size_mm[1]), float(thickness + relief)]

    manifest: Dict[str, Any] = {
        "schema": "hexforge3d.manifest.v1",
        "engine_version": ENGINE_VERSION,
        "created_utc": created_utc,
        "mode": "relief",
        "name": safe_name,
        "params": {
            "size_mm": [float(size_mm[0]), float(size_mm[1])],
            "thickness": float(thickness),
            "relief": float(relief),
            "invert": bool(invert),
            "preview": bool(preview),
        },
        "dimensions_mm": dims_xyz,
        "engine": {
            "engine_dir": str(ENGINE_DIR),
            "python": str(PY),
            "platform": platform.platform(),
        },
        "inputs": {
            "source_image": str(Path(image_path)),
            "engine_image_copy": str(img_dst),
        },
        "outputs": {
            "heightmap": str(hm),
            "stl": str(stl),
            "previews": previews,  # existing legacy preview dict
            "basenames": {
                "heightmap": hm.name,
                "stl": stl.name,
                **({f"preview_{k}": Path(v).name for k, v in previews.items()} if previews else {}),
            },
        },
    }

    # ------------------------------------------------------------
    # Blender previews (iso/top/side/hero) - best effort only
    # ------------------------------------------------------------
    previews_dir = None
    try:
        previews_dir = OUTPUT / f"previews_{stl.stem}"
        previews_res = render_stl_previews(str(stl), str(previews_dir), size=900)

        # Put them in outputs as well (keeps manifest consistent)
        manifest["outputs"]["blender_previews"] = {
            "iso": f"{previews_dir.name}/iso.png",
            "top": f"{previews_dir.name}/top.png",
            "side": f"{previews_dir.name}/side.png",
            "hero": f"{previews_dir.name}/hero.png",
        }
        manifest["outputs"]["blender_previews_manifest"] = f"{previews_dir.name}/previews.json"
        manifest["outputs"]["blender_previews_status"] = "ok" if previews_res.get("ok") else "failed"

        if not previews_res.get("ok"):
            err = (previews_res.get("stderr") or previews_res.get("stdout") or "").strip()
            manifest["outputs"]["blender_previews_error"] = err[-2000:] if err else "unknown_error"
            manifest.setdefault("warnings", []).append("blender_previews_failed")

    except Exception as e:
        manifest["outputs"]["blender_previews_status"] = "failed"
        manifest["outputs"]["blender_previews_error"] = f"exception: {e}"
        manifest.setdefault("warnings", []).append("blender_previews_exception")

    _safe_json_dump(manifest_path, manifest)

    # Return (API response)
    return {
        "heightmap": str(hm),
        "stl": str(stl),
        "previews": previews,
        "manifest": str(manifest_path),
        "size_mm": dims_xyz,
        "engine_dir": str(ENGINE_DIR),
        "python": str(PY),
        "previews_dir": str(previews_dir) if previews_dir else None,
    }
