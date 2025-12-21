# ... earlier code omitted for brevity ...

# -----------------------------
# Blender previews (best effort)
# -----------------------------
blender_status = "skipped"
blender_previews_job_local: dict[str, str] = {}
blender_previews_manifest_job_local: str | None = None

published_previews: dict[str, dict[str, str]] = {}  # key -> {engine_path, url}
published_preview_urls: dict[str, str] = {}          # key -> url
published_preview_manifest: dict[str, str] | None = None

try:
    if stl_local and Path(stl_local).exists():
        # Always attempt to render previews; treat as ok if any files were produced.
        previews_res = render_stl_previews(stl_local, str(previews_dir), size=900)

        blender_previews_job_local = previews_res.get("files") or {}
        blender_previews_manifest_job_local = previews_res.get("previews_json") or None

        # Determine blender_status: ok if blender exited cleanly OR we have at least one preview file
        if previews_res.get("ok") or blender_previews_job_local:
            blender_status = "ok"
        else:
            blender_status = "failed"

        base = f"{safe_name}__{job_id}"
        # Publish any previews that exist
        if blender_previews_job_local:
            for key, p in blender_previews_job_local.items():
                pp = Path(p)
                if pp.exists():
                    pub = _publish_to_assets(pp, f"{base}__{key}.png")
                    published_previews[key] = pub
                    published_preview_urls[key] = pub["url"]
        else:
            # collect error info for debugging
            err = (previews_res.get("stderr") or previews_res.get("stdout") or "").strip()
            payload.setdefault("warnings", []).append("blender_previews_failed")
            payload["blender_previews_error"] = err[-2000:] if err else "unknown_error"

        # Publish preview manifest if available
        if blender_previews_manifest_job_local:
            mf = Path(blender_previews_manifest_job_local)
            if mf.exists():
                published_preview_manifest = _publish_to_assets(mf, f"{base}__previews.json")

except Exception as e:
    blender_status = "failed"
    payload.setdefault("warnings", []).append("blender_previews_exception")
    payload["blender_previews_error"] = f"exception: {e}"

# -----------------------------
# Publish the primary outputs too (png/stl/engine manifest)
# -----------------------------
# ... unchanged ...

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

    # Expose preview status and job-local preview paths for backward compatibility
    "blender_previews_status": blender_status,
    "blender_previews": {k: v.get("engine_path") for k, v in published_previews.items()},
    "blender_previews_manifest": (
        published_preview_manifest["engine_path"] if published_preview_manifest else None
    ),
}

update_job(job_id, status="done", progress=100, result=output, result_raw=payload)
return output
