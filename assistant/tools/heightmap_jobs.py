import os
import json
import time
import uuid
from pathlib import Path
from typing import Optional, Dict, Any

# ============================================================
# Job storage (filesystem)
# ============================================================
BASE = Path(os.getenv("HEIGHTMAP_JOBS_DIR", "/data/hexforge3d/jobs/heightmap"))
UPLOADS = BASE / "uploads"
JOBS = BASE / "meta"

# New: optional shared artifacts root (if you want it)
ARTIFACTS = BASE / "artifacts"


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def ensure_dirs():
    UPLOADS.mkdir(parents=True, exist_ok=True)
    JOBS.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)


def new_job_id() -> str:
    return uuid.uuid4().hex


def job_path(job_id: str) -> Path:
    return JOBS / f"{job_id}.json"


def job_dir(job_id: str) -> Path:
    """
    Job-local directory where we colocate outputs for this job.
    """
    return ARTIFACTS / job_id


# ------------------------------------------------------------
# Persistence
# ------------------------------------------------------------
def write_job(job: Dict[str, Any]):
    job["updated_at"] = int(time.time())
    job_path(job["id"]).write_text(
        json.dumps(job, indent=2),
        encoding="utf-8",
    )


def read_job(job_id: str) -> Optional[Dict[str, Any]]:
    p = job_path(job_id)
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def update_job(job_id: str, **patch):
    job = read_job(job_id)
    if not job:
        return
    job.update(patch)
    write_job(job)


# ------------------------------------------------------------
# Job lifecycle
# ------------------------------------------------------------
def create_job(name: str, upload_filename: str) -> Dict[str, Any]:
    ensure_dirs()

    jid = new_job_id()

    # Create job-local folder structure
    jd = job_dir(jid)
    (jd / "outputs").mkdir(parents=True, exist_ok=True)
    (jd / "outputs" / "previews").mkdir(parents=True, exist_ok=True)
    (jd / "inputs").mkdir(parents=True, exist_ok=True)

    job = {
        "id": jid,
        "type": "heightmap",
        "name": name,
        "status": "queued",       # queued → running → done / failed
        "created_at": int(time.time()),
        "updated_at": int(time.time()),
        "upload_filename": upload_filename,
        "progress": 0,            # 0–100
        "error": None,
        "result": None,           # { heightmap, stl, manifest, previews... }
        "result_raw": None,       # full engine output (optional)

        # New: where this job’s artifacts live
        "job_dir": str(jd),
    }

    write_job(job)
    return job


def list_jobs(limit: int = 50, offset: int = 0) -> Dict[str, Any]:
    ensure_dirs()
    files = sorted(JOBS.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)

    total = len(files)
    slice_files = files[offset: offset + limit]

    items = []
    for p in slice_files:
        try:
            j = json.loads(p.read_text(encoding="utf-8"))
            j.pop("result_raw", None)
            items.append(j)
        except Exception:
            continue

    return {"total": total, "limit": limit, "offset": offset, "items": items}


def delete_job(job_id: str) -> bool:
    p = job_path(job_id)
    if not p.exists():
        return False
    p.unlink(missing_ok=True)
    return True
