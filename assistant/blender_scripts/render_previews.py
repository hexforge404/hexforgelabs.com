#!/usr/bin/env python3
"""
HexForge Blender Preview Renderer (Headless)

What this does
- Imports an STL
- Centers it, measures bounds
- Sets up a simple world + lights + camera
- Renders 4 preview PNGs (hero/iso/top/side) with transparent background
- Writes previews.json manifest

Usage (from shell):
  blender --background --factory-startup --python render_previews.py -- \
    --stl /path/to/model.stl \
    --outdir /path/to/output_dir \
    --basename my_model \
    --size 1024 \
    --samples 64 \
    --engine CYCLES

Outputs:
  <outdir>/<basename>__hero.png
  <outdir>/<basename>__iso.png
  <outdir>/<basename>__top.png
  <outdir>/<basename>__side.png
  <outdir>/previews.json

Exit codes:
  0 = success
  2 = runtime failure

Important note (your current failure):
- Your Blender build reports: "build has no OpenImageDenoise support"
- So any attempt to enable Cycles denoising can crash renders.
- This script FORCE-DISABLES denoise and logs it.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

# Blender-only imports (must exist when running inside Blender)
import bpy  # type: ignore
from mathutils import Vector  # type: ignore


# -------------------------
# Logging helpers
# -------------------------
def _log(msg: str) -> None:
    print(f"[render_previews] {msg}", flush=True)


def _now() -> float:
    return time.time()


def _fmt_seconds(s: float) -> str:
    if s < 1:
        return f"{s*1000:.0f}ms"
    return f"{s:.2f}s"


# -------------------------
# Args
# -------------------------
def _parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stl", required=True, help="Path to STL file")
    ap.add_argument("--outdir", required=True, help="Output directory")
    ap.add_argument("--basename", required=True, help="Base output filename (no extension)")
    ap.add_argument("--size", type=int, default=1024, help="Output image size (square)")
    ap.add_argument("--samples", type=int, default=64, help="Cycles samples")
    ap.add_argument("--engine", choices=["CYCLES", "BLENDER_EEVEE"], default="CYCLES")
    ap.add_argument("--no_transparent", action="store_true", help="Disable transparent film")
    ap.add_argument("--debug", action="store_true", help="Extra debug logging")

    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []

    return ap.parse_args(argv)


# -------------------------
# Scene setup
# -------------------------
def _reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _ensure_outdir(path: str) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


def _blender_build_info() -> Dict[str, str]:
    # Avoid anything fancy; just basic IDs that help debugging.
    return {
        "blender_version": bpy.app.version_string,
        "blender_binary_path": bpy.app.binary_path or "",
        "platform": sys.platform,
    }


def _import_stl(path: str):
    # Blender 4.x importer
    bpy.ops.wm.stl_import(filepath=path)
    objs = [o for o in bpy.context.selected_objects if o.type == "MESH"]

    # Fallback: scan scene for meshes (sometimes selection isn't populated)
    if not objs:
        objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]

    if not objs:
        raise RuntimeError("No mesh objects imported from STL.")

    return objs


def _join_meshes(objs):
    bpy.context.view_layer.objects.active = objs[0]
    for o in objs:
        o.select_set(True)

    if len(objs) > 1:
        bpy.ops.object.join()

    obj = bpy.context.active_object
    if not obj:
        raise RuntimeError("Join failed; no active object.")

    return obj


def _center_and_measure(obj) -> Tuple[float, Vector, Vector, Vector]:
    """
    Returns:
      radius (float), center (Vector), size (Vector), min_v/max_v (Vectors)
    """
    # Set origin to geometry and center object at world origin
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0.0, 0.0, 0.0)

    # Apply transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    bpy.context.view_layer.update()

    bbox = [Vector(v) for v in obj.bound_box]
    bbox_world = [obj.matrix_world @ v for v in bbox]

    min_v = Vector(
        (
            min(v.x for v in bbox_world),
            min(v.y for v in bbox_world),
            min(v.z for v in bbox_world),
        )
    )
    max_v = Vector(
        (
            max(v.x for v in bbox_world),
            max(v.y for v in bbox_world),
            max(v.z for v in bbox_world),
        )
    )

    size = max_v - min_v
    center = (min_v + max_v) * 0.5

    # radius-ish used to place camera
    radius = max(size.x, size.y, size.z) * 0.6

    # avoid zero-size weirdness
    if radius <= 0:
        radius = 1.0

    return radius, center, size, min_v, max_v


def _setup_render(engine: str, size: int, samples: int, transparent: bool, debug: bool) -> Dict[str, Any]:
    """
    Returns a dict of render settings for manifest/debug.
    """
    scene = bpy.context.scene
    scene.render.engine = engine
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = bool(transparent)

    # Ensure PNG output
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.compression = 15

    # Color management consistency (prevents “mystery brightness”)
    view = scene.view_settings
    view.view_transform = "Filmic"
    view.look = "None"
    view.exposure = 0.0
    view.gamma = 1.0

    render_info: Dict[str, Any] = {
        "engine": engine,
        "size": size,
        "samples": samples,
        "transparent": bool(transparent),
        "denoise": None,
        "device": None,
    }

    if engine == "CYCLES":
        # Headless-safe defaults
        scene.cycles.samples = int(samples)
        scene.cycles.device = "CPU"
        render_info["device"] = "CPU"

        # ✅ FIX: Your Blender build lacks OpenImageDenoise support.
        # Enabling denoise causes:
        #   "Failed to denoise, build has no OpenImageDenoise support"
        #
        # Force it off in both the scene and view layers (Blender may store it per layer).
        try:
            scene.cycles.use_denoising = False
        except Exception:
            pass

        try:
            for vl in scene.view_layers:
                try:
                    vl.cycles.use_denoising = False
                except Exception:
                    pass
        except Exception:
            pass

        render_info["denoise"] = "OFF (forced)"

    if debug:
        _log(f"Render settings: {json.dumps(render_info, ensure_ascii=False)}")

    return render_info


def _setup_world() -> None:
    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        bpy.context.scene.world = world

    world.use_nodes = True
    nt = world.node_tree

    for n in list(nt.nodes):
        nt.nodes.remove(n)

    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (0.02, 0.03, 0.05, 1.0)
    bg.inputs["Strength"].default_value = 1.0

    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])


def _add_area_light(location, energy: float, size: float) -> None:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.active_object
    light.data.energy = float(energy)
    light.data.size = float(size)


def _setup_lights() -> None:
    _add_area_light((3, -3, 4), energy=1200, size=2.0)   # key
    _add_area_light((-4, 2, 2), energy=600, size=3.0)    # fill


def _setup_camera(radius: float):
    bpy.ops.object.camera_add()
    cam = bpy.context.active_object
    bpy.context.scene.camera = cam

    cam.data.lens = 55
    cam.location = (0, -radius * 3.0, radius * 2.0)
    return cam


def _look_at(obj, target: Vector) -> None:
    direction = target - obj.location
    rot_quat = direction.to_track_quat("-Z", "Y")
    obj.rotation_euler = rot_quat.to_euler()


def _render_to(path: str, debug: bool = False) -> None:
    bpy.context.scene.render.filepath = path
    t0 = _now()
    bpy.ops.render.render(write_still=True)
    if debug:
        _log(f"Rendered: {path} in {_fmt_seconds(_now() - t0)}")


# -------------------------
# Manifest
# -------------------------
def _write_manifest(outdir: Path, manifest: Dict[str, Any]) -> None:
    (outdir / "previews.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


# -------------------------
# Main
# -------------------------
def main() -> None:
    t_start = _now()
    args = _parse_args()

    stl_path = str(Path(args.stl).resolve())
    outdir = Path(args.outdir).resolve()
    basename = str(args.basename).strip()

    if not basename:
        raise ValueError("basename is required and cannot be empty")

    _ensure_outdir(str(outdir))

    if not os.path.exists(stl_path):
        raise FileNotFoundError(f"STL not found: {stl_path}")

    _log("Starting headless preview render...")
    _log(f"STL: {stl_path}")
    _log(f"OUT: {outdir}")
    _log(f"BASE: {basename}")
    _log(f"Blender: {bpy.app.version_string}")

    # Fresh scene
    _reset_scene()

    # Render + look
    render_info = _setup_render(
        args.engine,
        int(args.size),
        int(args.samples),
        transparent=(not args.no_transparent),
        debug=bool(args.debug),
    )
    _setup_world()
    _setup_lights()

    # Import + measure
    t_import = _now()
    objs = _import_stl(stl_path)
    obj = _join_meshes(objs)
    radius, center, size, min_v, max_v = _center_and_measure(obj)
    _log(f"Imported meshes: {len(objs)} in {_fmt_seconds(_now() - t_import)}")
    _log(f"Bounds size: ({size.x:.4f}, {size.y:.4f}, {size.z:.4f}) radius≈{radius:.4f}")

    cam = _setup_camera(radius)

    # Output file paths
    hero = str(outdir / f"{basename}__hero.png")
    iso = str(outdir / f"{basename}__iso.png")
    top = str(outdir / f"{basename}__top.png")
    side = str(outdir / f"{basename}__side.png")

    # Hero: slightly above, angled
    cam.location = Vector((radius * 2.4, -radius * 2.6, radius * 1.9))
    _look_at(cam, center)
    _render_to(hero, debug=bool(args.debug))

    # Iso: classic iso-ish
    cam.location = Vector((radius * 2.8, -radius * 2.2, radius * 2.2))
    _look_at(cam, center)
    _render_to(iso, debug=bool(args.debug))

    # Top: straight down
    cam.location = Vector((0.0, 0.0, radius * 4.0))
    _look_at(cam, center)
    _render_to(top, debug=bool(args.debug))

    # Side: front view
    cam.location = Vector((0.0, -radius * 4.0, radius * 0.8))
    _look_at(cam, center)
    _render_to(side, debug=bool(args.debug))

    files = {"hero": hero, "iso": iso, "top": top, "side": side}

    manifest: Dict[str, Any] = {
        "schema": "hexforge.blender.previews.v2",
        "ok": True,
        "stl": stl_path,
        "outdir": str(outdir),
        "basename": basename,
        "files": files,
        "render": render_info,
        "bounds": {
            "min": {"x": float(min_v.x), "y": float(min_v.y), "z": float(min_v.z)},
            "max": {"x": float(max_v.x), "y": float(max_v.y), "z": float(max_v.z)},
            "size": {"x": float(size.x), "y": float(size.y), "z": float(size.z)},
            "center": {"x": float(center.x), "y": float(center.y), "z": float(center.z)},
            "radius": float(radius),
        },
        "blender": _blender_build_info(),
        "timings": {
            "total_secs": float(_now() - t_start),
        },
    }

    _write_manifest(outdir, manifest)
    _log(f"OK (total {_fmt_seconds(_now() - t_start)})")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        # Try to emit a manifest even on failure (helps your job system surface details)
        try:
            outdir_arg: Optional[str] = None
            basename_arg: Optional[str] = None
            stl_arg: Optional[str] = None

            # best-effort parse for manifest; avoid crashing if args are weird
            argv = sys.argv
            if "--" in argv:
                argv = argv[argv.index("--") + 1 :]
            else:
                argv = []

            for i, a in enumerate(argv):
                if a == "--outdir" and i + 1 < len(argv):
                    outdir_arg = argv[i + 1]
                if a == "--basename" and i + 1 < len(argv):
                    basename_arg = argv[i + 1]
                if a == "--stl" and i + 1 < len(argv):
                    stl_arg = argv[i + 1]

            if outdir_arg:
                outdir = Path(outdir_arg).resolve()
                outdir.mkdir(parents=True, exist_ok=True)
                fail_manifest = {
                    "schema": "hexforge.blender.previews.v2",
                    "ok": False,
                    "error": str(e),
                    "traceback": traceback.format_exc(),
                    "stl": stl_arg,
                    "outdir": str(outdir),
                    "basename": basename_arg,
                    "blender": _blender_build_info(),
                }
                (outdir / "previews.json").write_text(
                    json.dumps(fail_manifest, indent=2, ensure_ascii=False),
                    encoding="utf-8",
                )
        except Exception:
            pass

        print("[render_previews] FAILED:", str(e), file=sys.stderr)
        traceback.print_exc()
        sys.exit(2)
