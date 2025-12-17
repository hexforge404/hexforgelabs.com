import os
import subprocess
from pathlib import Path

# ------------------------------------------------------------
# Engine configuration
# ------------------------------------------------------------

ENGINE_DIR = Path(os.getenv("HEXFORGE3D_ENGINE_DIR", "/data/hexforge3d"))
PY = ENGINE_DIR / "venv" / "bin" / "python"

INPUT = ENGINE_DIR / "input"
OUTPUT = ENGINE_DIR / "output"


# ------------------------------------------------------------
# Internal runner
# ------------------------------------------------------------

def _run(cmd, cwd: Path):
    """
    Run a subprocess command and capture stdout/stderr.
    Raises a RuntimeError with full context on failure.
    """
    p = subprocess.run(
        cmd,
        cwd=str(cwd),
        text=True,
        capture_output=True,
    )

    if p.returncode != 0:
        raise RuntimeError(
            "Command failed:\n"
            f"{' '.join(cmd)}\n\n"
            f"STDOUT:\n{p.stdout}\n\n"
            f"STDERR:\n{p.stderr}"
        )

    return p.stdout


# ------------------------------------------------------------
# Public API
# ------------------------------------------------------------

def generate_relief(
    image_path: str,
    name: str = "asset",
    size_mm=(80, 80),
    thickness: float = 2.0,
    relief: float = 4.0,
    invert: bool = True,
):
    """
    Generate a grayscale heightmap and a relief STL from an image.

    Returns paths and final dimensions.
    """

    # Ensure directories exist
    INPUT.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)

    # Copy input image into engine workspace
    img_dst = INPUT / f"{name}.png"
    img_dst.write_bytes(Path(image_path).read_bytes())

    # Output files
    hm = OUTPUT / f"{name}_hm.png"
    stl = OUTPUT / f"{name}_relief.stl"

    # --------------------------------------------------------
    # Step 1: Image → Heightmap
    # --------------------------------------------------------

    cmd_hm = [
        str(PY),
        "bin/gray2heightmap.py",
        str(img_dst),
        "-o", str(hm),
        "--autocontrast",
        "--max-px", "1024",
    ]

    if invert:
        cmd_hm.append("--invert")

    _run(cmd_hm, cwd=ENGINE_DIR)

    # --------------------------------------------------------
    # Step 2: Heightmap → STL
    # --------------------------------------------------------

    cmd_stl = [
        str(PY),
        "bin/gray2stl.py",
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

    _run(cmd_stl, cwd=ENGINE_DIR)

    # --------------------------------------------------------
    # Result payload
    # --------------------------------------------------------

    return {
        "heightmap": str(hm),
        "stl": str(stl),
        "size_mm": [size_mm[0], size_mm[1], thickness + relief],
        "engine_dir": str(ENGINE_DIR),
        "python": str(PY),
    }
