#!/usr/bin/env python3
"""
HexForge Blender Preview Renderer (Headless)

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
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import traceback
from pathlib import Path
from typing import Dict

# Blender-only imports (must exist when running inside Blender)
import bpy  # type: ignore
from mathutils import Vector  # type: ignore


def _log(msg: str) -> None:
    print(f"[render_previews] {msg}", flush=True)


def _parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stl", required=True, help="Path to STL file")
    ap.add_argument("--outdir", required=True, help="Output directory")
    ap.add_argument("--basename", required=True, help="Base output filename (no extension)")
    ap.add_argument("--size", type=int, default=1024, help="Output image size (square)")
    ap.add_argument("--samples", type=int, default=64, help="Cycles samples")
    ap.add_argument("--engine", choices=["CYCLES", "BLENDER_EEVEE"], default="CYCLES")

    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []

    return ap.parse_args(argv)


def _reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _ensure_outdir(path: str) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


def _import_stl(path: str):
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


def _center_and_measure(obj):
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
    # radius-ish used to place camera
    radius = max(size.x, size.y, size.z) * 0.6
    center = (min_v + max_v) * 0.5

    # avoid zero-size weirdness
    if radius <= 0:
        radius = 1.0

    return radius, center


def _setup_render(engine: str, size: int, samples: int) -> None:
    scene = bpy.context.scene
    scene.render.engine = engine
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True

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

    if engine == "CYCLES":
        scene.cycles.samples = samples
        scene.cycles.use_denoising = True
        scene.cycles.device = "CPU"  # safest headless default


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
    light.data.energy = energy
    light.data.size = size


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


def _render_to(path: str) -> None:
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def _write_manifest(outdir: Path, files: Dict[str, str]) -> None:
    manifest = {
        "schema": "hexforge.blender.previews.v1",
        "ok": True,
        "files": files,
    }
    (outdir / "previews.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main() -> None:
    args = _parse_args()

    stl_path = str(Path(args.stl).resolve())
    outdir = Path(args.outdir).resolve()
    basename = str(args.basename).strip()

    if not basename:
        raise ValueError("basename is required and cannot be empty")

    _ensure_outdir(str(outdir))

    if not os.path.exists(stl_path):
        raise FileNotFoundError(f"STL not found: {stl_path}")

    _reset_scene()
    _setup_render(args.engine, args.size, args.samples)
    _setup_world()
    _setup_lights()

    objs = _import_stl(stl_path)
    obj = _join_meshes(objs)
    radius, center = _center_and_measure(obj)

    cam = _setup_camera(radius)

    # Output file paths
    hero = str(outdir / f"{basename}__hero.png")
    iso = str(outdir / f"{basename}__iso.png")
    top = str(outdir / f"{basename}__top.png")
    side = str(outdir / f"{basename}__side.png")

    # Hero: slightly above, angled
    cam.location = Vector((radius * 2.4, -radius * 2.6, radius * 1.9))
    _look_at(cam, center)
    _render_to(hero)

    # Iso: classic iso-ish
    cam.location = Vector((radius * 2.8, -radius * 2.2, radius * 2.2))
    _look_at(cam, center)
    _render_to(iso)

    # Top: straight down
    cam.location = Vector((0.0, 0.0, radius * 4.0))
    _look_at(cam, center)
    _render_to(top)

    # Side: front view
    cam.location = Vector((0.0, -radius * 4.0, radius * 0.8))
    _look_at(cam, center)
    _render_to(side)

    files = {"hero": hero, "iso": iso, "top": top, "side": side}
    _write_manifest(outdir, files)

    _log("OK")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        print("[render_previews] FAILED:", str(e), file=sys.stderr)
        traceback.print_exc()
        sys.exit(2)
