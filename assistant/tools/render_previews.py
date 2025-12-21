from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, Optional

BLENDER_BIN = os.getenv("BLENDER_BIN", "blender")

# Determine default script path relative to this file.
# The previous version hard‑coded `/app/assistant/blender_scripts/render_previews.py`,
# which breaks if the repository is mounted elsewhere.  We compute it from __file__.
_DEFAULT_SCRIPT_PATH = Path(__file__).resolve().parents[1] / "blender_scripts" / "render_previews.py"
SCRIPT_PATH = os.getenv(
    "BLENDER_PREVIEW_SCRIPT",
    str(_DEFAULT_SCRIPT_PATH),
)

# Prevent Blender from hanging forever in a container
BLENDER_TIMEOUT_SECS = int(os.getenv("BLENDER_PREVIEW_TIMEOUT_SECS", "180"))

def _tail(s: Optional[str], n: int = 4000) -> str:
    if not s:
        return ""
    return s[-n:]

def _safe_load_manifest(path: Path) -> Optional[Dict[str, Any]]:
    try:
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None

def render_stl_previews(stl_path: str, out_dir: str, size: int = 900) -> dict:
    """
    Runs Blender headless to render iso/top/side/hero previews via Blender script.

    Expected Blender script behavior:
      - Writes: <outdir>/previews.json
      - Writes: <outdir>/<basename>__hero.png etc (paths recorded in previews.json)

    Returns a dict with:
      - ok (bool)
      - out_dir (str)
      - previews_json (str | None)
      - files (dict of shot->path)
      - stdout/stderr (truncated)
      - cmd (list)
      - returncode (int)
      - error (str | None)
    """
    stl = str(Path(stl_path).resolve())
    out_path = Path(out_dir).resolve()
    out_path.mkdir(parents=True, exist_ok=True)

    # Keep predictable output names; manifest uses "previews.json"
    basename = "previews"
    previews_json_path = out_path / "previews.json"

    cmd = [
        BLENDER_BIN,
        "-b",
        "--factory-startup",
        "--python",
        SCRIPT_PATH,
        "--",
        "--stl",
        stl,
        "--outdir",
        str(out_path),
        "--basename",
        basename,
        "--size",
        str(int(size)),
    ]

    stdout = ""
    stderr = ""
    returncode = 999
    timed_out = False

    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=BLENDER_TIMEOUT_SECS,
        )
        stdout = proc.stdout or ""
        stderr = proc.stderr or ""
        returncode = int(proc.returncode)
    except subprocess.TimeoutExpired as e:
        timed_out = True
        stdout = (e.stdout or "") if isinstance(e.stdout, str) else ""
        stderr = (e.stderr or "") if isinstance(e.stderr, str) else ""
        returncode = 124  # standard-ish timeout code

    # Prefer manifest-based discovery
    files: Dict[str, str] = {}
    manifest = _safe_load_manifest(previews_json_path)

    if manifest and isinstance(manifest, dict):
        mfiles = manifest.get("files")
        if isinstance(mfiles, dict):
            for k, v in mfiles.items():
                try:
                    p = Path(str(v))
                    if not p.is_absolute():
                        p = (out_path / p).resolve()
                    if p.exists():
                        files[str(k)] = str(p)
                except Exception:
                    continue

    # Fallback if manifest missing: try expected names
    if not files:
        for shot in ["hero", "iso", "top", "side"]:
            p = out_path / f"{basename}__{shot}.png"
            if p.exists():
                files[shot] = str(p)

    ok = (returncode == 0) and previews_json_path.exists()

    err: Optional[str] = None
    if timed_out:
        err = f"blender timeout after {BLENDER_TIMEOUT_SECS}s"
    elif not ok:
        # give the most useful failure info
        err = "blender preview render failed"

    return {
        "ok": ok,
        "returncode": returncode,
        "out_dir": str(out_path),
        "previews_json": str(previews_json_path) if previews_json_path.exists() else None,
        "files": files,
        "stdout": _tail(stdout),
        "stderr": _tail(stderr),
        "cmd": cmd,
        "error": err,
    }
