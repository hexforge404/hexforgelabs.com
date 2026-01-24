// HeightmapPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./HeightmapPage.css";

/**
 * ENV (frontend/.env.production):
 * REACT_APP_TOOLS_BASE_URL=https://tools.hexforgelabs.com
 * REACT_APP_HEIGHTMAP_ASSETS_URL=https://hexforgelabs.com/assets/heightmap
 */
const TOOLS_BASE = (process.env.REACT_APP_TOOLS_BASE_URL || "").replace(/\/+$/, "");
const ASSETS_BASE = (process.env.REACT_APP_HEIGHTMAP_ASSETS_URL || "/assets/heightmap").replace(
  /\/+$/,
  ""
);

/**
 * Turn backend-provided paths into absolute, correct-host URLs.
 *
 * Rules:
 * - absolute http(s): keep
 * - "/assets/heightmap/..." OR "assets/heightmap/..." -> use ASSETS_BASE + (path after assets/heightmap/)
 * - "/tool/..." -> TOOLS_BASE + path
 * - "/..." (unknown root-relative) -> assume same host as TOOLS_BASE (safer than current origin)
 * - "foo/bar.png" -> "/foo/bar.png" on TOOLS_BASE host
 */
function resolvePublicUrl(urlOrPath) {
  if (!urlOrPath) return null;
  const s = String(urlOrPath).trim();
  if (!s) return null;

  // already absolute
  if (/^https?:\/\//i.test(s)) return s;

  // common: backend returns "/assets/heightmap/xyz.png" OR "/assets/heightmap/sub/xyz.png"
  if (s.startsWith("/assets/heightmap/")) {
    const rel = s.replace(/^\/assets\/heightmap\//, "");
    return rel ? `${ASSETS_BASE}/${rel}` : null;
  }

  // sometimes returned without leading slash
  if (s.startsWith("assets/heightmap/")) {
    const rel = s.replace(/^assets\/heightmap\//, "");
    return rel ? `${ASSETS_BASE}/${rel}` : null;
  }

  // status_url and other tool endpoints
  if (s.startsWith("/tool/")) {
    return TOOLS_BASE ? `${TOOLS_BASE}${s}` : s;
  }

  // any other root-relative path: safest to bind to TOOLS_BASE host (not the current page host)
  if (s.startsWith("/")) {
    return TOOLS_BASE ? `${TOOLS_BASE}${s}` : s;
  }

  // plain relative path fragment -> treat as path on TOOLS_BASE host
  return TOOLS_BASE ? `${TOOLS_BASE}/${s.replace(/^\/+/, "")}` : `/${s.replace(/^\/+/, "")}`;
}

/**
 * Maps an engine path or url to the public assets URL.
 * Important: preserves subfolders under assets/heightmap.
 *
 * Examples:
 * - "/assets/heightmap/foo.png" -> `${ASSETS_BASE}/foo.png`
 * - "/assets/heightmap/job-123/foo.png" -> `${ASSETS_BASE}/job-123/foo.png`
 * - "assets/heightmap/job-123/foo.png" -> `${ASSETS_BASE}/job-123/foo.png`
 * - "/mnt/.../assets/heightmap/job-123/foo.png" -> `${ASSETS_BASE}/job-123/foo.png`
 * - "foo.png" -> `${ASSETS_BASE}/foo.png`
 */
function toHeightmapAssetUrl(enginePathOrUrl) {
  if (!enginePathOrUrl) return null;
  const s = String(enginePathOrUrl).trim();
  if (!s) return null;

  // already absolute URL
  if (/^https?:\/\//i.test(s)) return s;

  // if it's already a public URL path, preserve relative path beneath assets/heightmap
  if (s.includes("/assets/heightmap/")) {
    const rel = s.split("/assets/heightmap/").pop();
    return rel ? `${ASSETS_BASE}/${rel.replace(/^\/+/, "")}` : null;
  }

  if (s.startsWith("assets/heightmap/")) {
    const rel = s.replace(/^assets\/heightmap\//, "");
    return rel ? `${ASSETS_BASE}/${rel.replace(/^\/+/, "")}` : null;
  }

  // otherwise assume it's an engine path and take filename
  const file = s.split("/").pop();
  if (!file) return null;
  return `${ASSETS_BASE}/${file}`;
}

function makeDefaultName() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `heightmap_${ts}`;
}

function pickFastApiError(data, fallback) {
  if (!data) return fallback;
  if (typeof data.detail === "string" && data.detail.trim()) return data.detail;

  const d0 = Array.isArray(data.detail) ? data.detail[0] : null;
  if (d0?.msg) return d0.msg;

  if (data.error?.message) return String(data.error.message);
  if (data.error) return String(data.error);
  if (data.message) return String(data.message);

  return fallback;
}

async function safeJsonFetch(url, opts) {
  const r = await fetch(url, opts);
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { r, text, data };
}

function fmtTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return "";
  }
}

function shortId(id) {
  if (!id) return "";
  const s = String(id);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function truthy(v) {
  return !!(v && String(v).trim());
}

function deriveMachineChecklist({ file, resp, jobStatus, previewUrl, stlUrl, blenderPreviews }) {
  const job = resp?.job || null;
  const status = jobStatus?.status || job?.status || "";
  const progress = jobStatus?.progress ?? job?.progress ?? 0;

  const hasJobId = truthy(jobStatus?.id || job?.id);
  const inputLoaded = !!file;
  const jobQueued = hasJobId;
  const heightmapGenerated =
    status === "done" || status === "running" || (progress ?? 0) > 0 || truthy(previewUrl);
  const previewsRendered =
    truthy(previewUrl) ||
    truthy(blenderPreviews?.hero) ||
    truthy(blenderPreviews?.iso) ||
    truthy(blenderPreviews?.top) ||
    truthy(blenderPreviews?.side);

  const exportReady = truthy(previewUrl) || truthy(stlUrl);

  return {
    status,
    progress,
    steps: [
      { key: "input", label: "INPUT LOADED", done: inputLoaded },
      { key: "queued", label: "JOB QUEUED", done: jobQueued },
      { key: "heightmap", label: "HEIGHTMAP GENERATED", done: heightmapGenerated },
      { key: "prev", label: "PREVIEWS RENDERED", done: previewsRendered },
      { key: "export", label: "EXPORT READY", done: exportReady },
    ],
  };
}

export default function HeightmapPage() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState(makeDefaultName());

  // ✅ NEW: optional subfolder for outputs (future-proof; backend can ignore today)
  const [subfolder, setSubfolder] = useState("");

  // Advanced options
  const [mode, setMode] = useState("relief");
  const [maxHeight, setMaxHeight] = useState(4.0);
  const [invert, setInvert] = useState(true);
  const [sizeMm, setSizeMm] = useState(80);
  const [thickness, setThickness] = useState(2.0);

  // (Optional: keep in state even if backend ignores today; useful for tool-panel UI)
  const [denoise, setDenoise] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resp, setResp] = useState(null);

  const [jobStatus, setJobStatus] = useState(null); // {id,status,progress}

  // Past jobs
  const [jobs, setJobs] = useState([]);
  const [jobsMeta, setJobsMeta] = useState({ total: 0, limit: 10, offset: 0 });
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");

  // Results UI tabs
  const [resultTab, setResultTab] = useState("heightmap"); // "heightmap" | "previews"

  // ✅ selected row highlight
  const [selectedJobId, setSelectedJobId] = useState(null);

  const result = useMemo(() => resp?.result || resp || null, [resp]);

  const publicPack = useMemo(
    () => (result && typeof result === "object" ? result.public : null),
    [result]
  );

  // Cache-buster for <img> tags (helps when CDN/browser caches aggressively)
  const imgBust = useMemo(() => {
    const t = resp?.job?.updated_at || Date.now();
    return `t=${encodeURIComponent(String(t))}`;
  }, [resp]);

  // Primary outputs (prefer public URLs)
  const previewUrl = useMemo(() => {
    const u = publicPack?.heightmap_url;
    if (u) return resolvePublicUrl(u);
    return toHeightmapAssetUrl(result?.heightmap);
  }, [publicPack, result]);

  const stlUrl = useMemo(() => {
    const u = publicPack?.stl_url;
    if (u) return resolvePublicUrl(u);
    return toHeightmapAssetUrl(result?.stl);
  }, [publicPack, result]);

  // Prefer job_manifest_url; fallback to preview manifest; final fallback to engine path
  const manifestUrl = useMemo(() => {
    const u = publicPack?.job_manifest_url || publicPack?.blender_previews_manifest_url;
    if (u) return resolvePublicUrl(u);
    return toHeightmapAssetUrl(result?.manifest);
  }, [publicPack, result]);

  // Blender previews (prefer published public URLs)
  const blenderPreviews = useMemo(() => {
    const pub = publicPack?.blender_previews_urls;
    if (pub && typeof pub === "object") {
      return {
        hero: resolvePublicUrl(pub.hero),
        iso: resolvePublicUrl(pub.iso),
        top: resolvePublicUrl(pub.top),
        side: resolvePublicUrl(pub.side),
      };
    }

    // Old format: engine paths -> ASSETS_BASE/<rel>
    const raw = result?.blender_previews || null;
    if (!raw || typeof raw !== "object") return null;

    const mapped = {};
    for (const [k, v] of Object.entries(raw)) {
      mapped[k] = toHeightmapAssetUrl(v);
    }
    return mapped;
  }, [publicPack, result]);

  const blenderStatus = useMemo(() => result?.blender_previews_status || "", [result]);

  const machine = useMemo(() => {
    return deriveMachineChecklist({
      file,
      resp,
      jobStatus,
      previewUrl,
      stlUrl,
      blenderPreviews,
    });
  }, [file, resp, jobStatus, previewUrl, stlUrl, blenderPreviews]);

  // ============================
  // Local inspection viewport (uses selected file)
  // ============================
  const previewLocalUrl = useMemo(() => {
    if (!file) return null;
    try {
      return URL.createObjectURL(file);
    } catch {
      return null;
    }
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewLocalUrl) URL.revokeObjectURL(previewLocalUrl);
    };
  }, [previewLocalUrl]);

  // Visual scale: map sizeMm 20..200 => 0.55..1.1
  const plateScale = useMemo(() => {
    const clamped = Math.max(20, Math.min(200, Number(sizeMm) || 80));
    return 0.55 + ((clamped - 20) / (200 - 20)) * 0.55;
  }, [sizeMm]);

  const heightPct = useMemo(() => {
    // maxHeight 0.5..10 => 0..100
    const v = Math.max(0, Math.min(10, Number(maxHeight) || 0));
    return (v / 10) * 100;
  }, [maxHeight]);

  const thickPct = useMemo(() => {
    // thickness 0..8 => 0..100
    const v = Math.max(0, Math.min(8, Number(thickness) || 0));
    return (v / 8) * 100;
  }, [thickness]);

  async function pollJob(statusUrl, timeoutMs = 10 * 60 * 1000) {
    const start = Date.now();
    const absStatusUrl = resolvePublicUrl(statusUrl);

    if (!absStatusUrl) throw new Error("Missing status URL from server.");

    while (true) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("Timed out waiting for the job to finish.");
      }

      const { r, data } = await safeJsonFetch(absStatusUrl, { method: "GET" });

      if (!r.ok || !data?.ok) {
        const msg = pickFastApiError(data, `Status check failed (${r.status})`);
        throw new Error(msg);
      }

      const job = data.job;
      setJobStatus({ id: job.id, status: job.status, progress: job.progress ?? 0 });

      if (job.status === "done") return job;
      if (job.status === "failed") throw new Error(job.error || "Job failed.");

      await new Promise((res) => setTimeout(res, 1500));
    }
  }

  async function generate() {
    setError("");
    setResp(null);
    setJobStatus(null);

    if (!file) return setError("Load an input image first.");
    if (!name.trim()) return setError("Job name is required.");
    if (!TOOLS_BASE) return setError("Tools base URL not configured. Set REACT_APP_TOOLS_BASE_URL.");

    const fd = new FormData();
    fd.append("image", file);
    fd.append("name", name.trim());
    fd.append("mode", mode);
    fd.append("max_height", String(maxHeight));
    fd.append("invert", String(invert));
    fd.append("size_mm", String(sizeMm));
    fd.append("thickness", String(thickness));
    // Safe: backend may ignore if not supported yet.
    fd.append("denoise", String(denoise));

    // ✅ NEW: optional output subfolder (backend may ignore today)
    if (subfolder.trim()) fd.append("subfolder", subfolder.trim());

    setLoading(true);
    try {
      const { r, data } = await safeJsonFetch(`${TOOLS_BASE}/tool/heightmap/v1`, {
        method: "POST",
        body: fd,
      });

      if (!r.ok || !data?.ok || !data?.status_url) {
        const msg = pickFastApiError(data, `Request failed (${r.status})`);
        throw new Error(msg);
      }

      setJobStatus({ id: data.job_id, status: "queued", progress: 0 });

      const job = await pollJob(data.status_url);

      setResp({ ok: true, result: job.result, job });
      setResultTab("heightmap");

      // highlight current job in archive if it exists
      setSelectedJobId(job.id);

      await refreshJobs({ resetPaging: true });
    } catch (e) {
      setError(e?.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setName(makeDefaultName());
    setSubfolder("");
    setMode("relief");
    setMaxHeight(4.0);
    setInvert(true);
    setSizeMm(80);
    setThickness(2.0);
    setDenoise(false);
    setResp(null);
    setError("");
    setJobStatus(null);
    setResultTab("heightmap");
    setSelectedJobId(null);
  }

  async function refreshJobs({ resetPaging = false, nextOffset = null } = {}) {
    if (!TOOLS_BASE) return;

    setJobsLoading(true);
    setJobsError("");

    try {
      const limit = 10;
      const offset =
        typeof nextOffset === "number" ? nextOffset : resetPaging ? 0 : jobsMeta.offset;

      const { r, data } = await safeJsonFetch(
        `${TOOLS_BASE}/tool/heightmap/v1/jobs?limit=${limit}&offset=${offset}`,
        { method: "GET" }
      );

      if (!r.ok || !data?.ok) {
        const msg = pickFastApiError(data, `Jobs fetch failed (${r.status})`);
        throw new Error(msg);
      }

      const pack = data.jobs;
      setJobsMeta({ total: pack.total, limit: pack.limit, offset: pack.offset });

      if (resetPaging) setJobs(pack.items || []);
      else setJobs((prev) => [...prev, ...(pack.items || [])]);
    } catch (e) {
      setJobsError(e?.message || "Failed to load past jobs.");
    } finally {
      setJobsLoading(false);
    }
  }

  async function loadJob(jobId) {
    if (!TOOLS_BASE) return;

    setError("");
    setResp(null);

    const { r, data } = await safeJsonFetch(`${TOOLS_BASE}/tool/heightmap/v1/jobs/${jobId}`, {
      method: "GET",
    });

    if (!r.ok || !data?.ok) {
      const msg = pickFastApiError(data, `Job fetch failed (${r.status})`);
      setError(msg);
      return;
    }

    const job = data.job;
    setResp({ ok: true, result: job.result, job });
    setJobStatus({ id: job.id, status: job.status, progress: job.progress ?? 0 });
    setResultTab("heightmap");

    // highlight selection
    setSelectedJobId(job.id);
  }

  async function deleteJob(jobId) {
    if (!TOOLS_BASE) return;

    if (!window.confirm("Delete this job record? (Outputs will remain on disk)")) return;

    const { r, data } = await safeJsonFetch(`${TOOLS_BASE}/tool/heightmap/v1/jobs/${jobId}`, {
      method: "DELETE",
    });

    if (!r.ok || !data?.ok) {
      const msg = pickFastApiError(data, `Delete failed (${r.status})`);
      setJobsError(msg);
      return;
    }

    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    if (selectedJobId === jobId) setSelectedJobId(null);
  }

  useEffect(() => {
    refreshJobs({ resetPaging: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canLoadMore = jobs.length < (jobsMeta.total || 0);

  // Flips ONLY the on-page preview to look "normal" while keeping the underlying file unchanged.
  const previewStyle = useMemo(() => {
    return invert ? { filter: "invert(1)" } : undefined;
  }, [invert]);

  const previewImgSrc = previewUrl
    ? `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}${imgBust}`
    : null;

  const machineStatus = machine.status || (loading ? "running" : "");
  const machineProgress = machine.progress ?? 0;

  // helpers: clamp input so slider+number never desync into NaN
  const setClampedMaxHeight = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    setMaxHeight(Math.max(0.5, Math.min(10, n)));
  };
  const setClampedSize = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    setSizeMm(Math.max(20, Math.min(200, Math.round(n))));
  };
  const setClampedThickness = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    setThickness(Math.max(0, Math.min(8, n)));
  };

  return (
    <div className="hf-hm-page">
      {/* HEADER */}
      <div className="hf-hm-header">
        <h1>HEXFORGE HEIGHTMAP ENGINE</h1>
        <p className="hf-muted">Load input → generate heightmap → preview → export.</p>
        <p className="hf-muted" style={{ marginTop: "0.35rem" }}>
          Next step: use these results in the Surface Engine to generate geometry.
        </p>
      </div>

      {/* MACHINE BAR */}
      <div className="hf-hm-card hf-hm-machinebar">
        <div className="hf-hm-machinebar-grid">
          <div className="hf-hm-machinebar-title">
            <div className="hf-hm-machinebar-brand">HEXFORGE HEIGHTMAP ENGINE</div>
            <div className="hf-hm-machinebar-sub">HEIGHTMAP GENERATION PIPELINE</div>
            <div className="hf-pill done">HEIGHTMAP</div>
          </div>

          <div className="hf-hm-machinebar-stats">
            <div className="hf-hm-stat">
              <div className="hf-hm-stat-k">STATUS</div>
              <div className={`hf-hm-stat-v hf-status ${machineStatus || "idle"}`}>
                {(machineStatus || "idle").toUpperCase()}
              </div>
            </div>

            <div className="hf-hm-stat">
              <div className="hf-hm-stat-k">ENGINE</div>
              <div className="hf-hm-stat-v">HEIGHTMAP v1</div>
            </div>

            <div className="hf-hm-stat">
              <div className="hf-hm-stat-k">JOB</div>
              <div className="hf-hm-stat-v">{shortId(jobStatus?.id || resp?.job?.id) || "—"}</div>
            </div>

            <div className="hf-hm-stat">
              <div className="hf-hm-stat-k">PROGRESS</div>
              <div className="hf-hm-stat-v">{Number(machineProgress || 0)}%</div>
            </div>

            <div className="hf-hm-stat">
              <div className="hf-hm-stat-k">DENOISE</div>
              <div className="hf-hm-stat-v">{denoise ? "ENABLED" : "OFF"}</div>
            </div>
          </div>

          {/* CHECKLIST */}
          <div className="hf-hm-machinebar-checklist">
            {machine.steps.map((s) => (
              <div
                key={s.key}
                className={`hf-hm-step ${s.done ? "done" : ""}`}
                title={s.done ? "OK" : "PENDING"}
              >
                <span className="hf-hm-step-mark">{s.done ? "✓" : "·"}</span>
                <span className="hf-hm-step-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* INPUT / CONTROLS */}
      <div className="hf-hm-card">
        <div className="hf-hm-grid">
          <label className="hf-hm-label">
            <span>INPUT IMAGE</span>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>

          <label className="hf-hm-label">
            <span>JOB NAME</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="hexforge_logo_relief" />
          </label>
        </div>

        <details className="hf-hm-raw">
          <summary>CONTROL PARAMETERS</summary>

          <div className="hf-hm-grid">
            <label className="hf-hm-label">
              <span>MODE</span>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="relief">RELIEF</option>
                <option value="engrave">ENGRAVE</option>
              </select>
            </label>

            {/* ✅ NEW: optional subfolder */}
            <label className="hf-hm-label">
              <span>OUTPUT SUBFOLDER (optional)</span>
              <input
                type="text"
                value={subfolder}
                onChange={(e) => setSubfolder(e.target.value)}
                placeholder="e.g. tree-of-life / client-xyz / decals"
              />
            </label>

            <label className="hf-hm-label">
              <span>MAX HEIGHT (mm)</span>
              <div className="hf-hm-sliderRow">
                <input
                  className="hf-hm-range"
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.1"
                  value={maxHeight}
                  onChange={(e) => setClampedMaxHeight(e.target.value)}
                />
                <input
                  className="hf-hm-num"
                  type="number"
                  step="0.1"
                  value={maxHeight}
                  onChange={(e) => setClampedMaxHeight(e.target.value)}
                />
              </div>
            </label>

            <label className="hf-hm-label">
              <span>SIZE (mm)</span>
              <div className="hf-hm-sliderRow">
                <input
                  className="hf-hm-range"
                  type="range"
                  min="20"
                  max="200"
                  step="1"
                  value={sizeMm}
                  onChange={(e) => setClampedSize(e.target.value)}
                />
                <input
                  className="hf-hm-num"
                  type="number"
                  step="1"
                  value={sizeMm}
                  onChange={(e) => setClampedSize(e.target.value)}
                />
              </div>
            </label>

            <label className="hf-hm-label">
              <span>BASE THICKNESS (mm)</span>
              <div className="hf-hm-sliderRow">
                <input
                  className="hf-hm-range"
                  type="range"
                  min="0"
                  max="8"
                  step="0.1"
                  value={thickness}
                  onChange={(e) => setClampedThickness(e.target.value)}
                />
                <input
                  className="hf-hm-num"
                  type="number"
                  step="0.1"
                  value={thickness}
                  onChange={(e) => setClampedThickness(e.target.value)}
                />
              </div>
            </label>

            <label className="hf-hm-label hf-hm-check">
              <span>INVERT</span>
              <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
            </label>

            <label className="hf-hm-label hf-hm-check">
              <span>DENOISE</span>
              <input type="checkbox" checked={denoise} onChange={(e) => setDenoise(e.target.checked)} />
            </label>
          </div>

          {/* Live inspection viewport */}
          <div className="hf-hm-viewport">
            <div className="hf-hm-viewportHead">
              <div className="hf-hm-viewportTitle">INSPECTION VIEWPORT</div>
              <div className="hf-hm-viewportMeta">
                {sizeMm}mm • Z {maxHeight}mm • BASE {thickness}mm
              </div>
            </div>

            <div className="hf-hm-viewportGrid">
              <div className="hf-hm-plateWrap">
                <div
                  className={`hf-hm-plate hf-hm-plate--${mode}`}
                  style={{ transform: `scale(${plateScale})` }}
                  title="Plate scale represents SIZE (mm)"
                >
                  <div className={`hf-hm-plateMask hf-hm-plateMask--${mode}`}>
                    {previewLocalUrl && (
                      <div
                        className="hf-hm-plateImg"
                        style={{
                          backgroundImage: `url(${previewLocalUrl})`,
                          filter: invert
                            ? "invert(1) saturate(0.85) contrast(1.1)"
                            : "saturate(0.85) contrast(1.1)",
                        }}
                      />
                    )}

                    <div
                      className="hf-hm-plateBase"
                      style={{ height: `${Math.max(6, thickPct * 0.35)}%` }}
                      title="Base band represents THICKNESS"
                    />

                    <div className="hf-hm-ruler hf-hm-rulerTop" aria-hidden="true" />
                    <div className="hf-hm-ruler hf-hm-rulerLeft" aria-hidden="true" />

                    <div className="hf-hm-rulerLabel hf-hm-rulerLabelTopL">0</div>
                    <div className="hf-hm-rulerLabel hf-hm-rulerLabelTopM">{Math.round(sizeMm / 2)}</div>
                    <div className="hf-hm-rulerLabel hf-hm-rulerLabelTopR">{Math.round(sizeMm)}</div>

                    <div className="hf-hm-rulerLabel hf-hm-rulerLabelLeftT">0</div>
                    <div className="hf-hm-rulerLabel hf-hm-rulerLabelLeftM">{Math.round(sizeMm / 2)}</div>
                    <div className="hf-hm-rulerLabel hf-hm-rulerLabelLeftB">{Math.round(sizeMm)}</div>

                    <div className="hf-hm-modeTag">{mode === "relief" ? "RELIEF PLATE" : "ENGRAVE DISC"}</div>
                  </div>
                </div>
              </div>

              <div className="hf-hm-gauges">
                <div className="hf-hm-gauge">
                  <div className="hf-hm-gaugeTop">
                    <span>RELIEF HEIGHT</span>
                    <span>{maxHeight}mm</span>
                  </div>
                  <div className="hf-hm-gaugeBar">
                    <div className="hf-hm-gaugeFill" style={{ width: `${heightPct}%` }} />
                  </div>
                </div>

                <div className="hf-hm-gauge">
                  <div className="hf-hm-gaugeTop">
                    <span>BASE THICKNESS</span>
                    <span>{thickness}mm</span>
                  </div>
                  <div className="hf-hm-gaugeBar">
                    <div className="hf-hm-gaugeFill" style={{ width: `${thickPct}%` }} />
                  </div>
                </div>

                <div className="hf-muted" style={{ fontSize: "0.85rem", lineHeight: 1.35 }}>
                  Live preview is a fast “tool panel” approximation. Later we can add real 3D displacement
                  preview (WebGL).
                </div>
              </div>
            </div>
          </div>

          {invert && (
            <div className="hf-muted" style={{ marginTop: "0.5rem" }}>
              Inspection viewport is visually inverted for readability; exported outputs are unchanged.
            </div>
          )}
        </details>

        <div className="hf-hm-actions">
          <button className="hf-hm-btn primary" onClick={generate} disabled={loading}>
            {loading ? `EXECUTING… ${jobStatus?.progress ?? 0}%` : "▶ EXECUTE HEIGHTMAP JOB"}
          </button>

          <button className="hf-hm-btn" onClick={reset} disabled={loading}>
            ⟲ RESET PANEL
          </button>

          {(jobStatus || resp?.job) && (
            <div className="hf-hm-jobline">
              <span className={`hf-pill ${jobStatus?.status || resp?.job?.status || "unknown"}`}>
                {(jobStatus?.status || resp?.job?.status || "unknown").toUpperCase()}
              </span>
              <span className="hf-hm-jobtext">JOB • {(jobStatus?.progress ?? resp?.job?.progress ?? 0)}%</span>
            </div>
          )}

          {error && <div className="hf-hm-error">{error}</div>}
        </div>
      </div>

      {/* CURRENT RESULT */}
      {resp && (
        <div className="hf-hm-results">
          <div className="hf-hm-card">
            <div className="hf-hm-links">
              {stlUrl && (
                <a className="hf-hm-link" href={stlUrl} download>
                  ⬇ HEIGHT DATA EXPORT
                </a>
              )}
              {manifestUrl && (
                <a className="hf-hm-link" href={manifestUrl} target="_blank" rel="noreferrer">
                  ⧉ VIEW JOB MANIFEST
                </a>
              )}
              {previewUrl && (
                <a className="hf-hm-link" href={previewUrl} target="_blank" rel="noreferrer">
                  🔍 VIEW HEIGHTMAP
                </a>
              )}
              {blenderPreviews?.hero && (
                <a className="hf-hm-link" href={blenderPreviews.hero} target="_blank" rel="noreferrer">
                  🔍 VIEW PREVIEW RENDERS
                </a>
              )}
            </div>

            <div className="hf-hm-tabs">
              <button className={`hf-hm-tab ${resultTab === "heightmap" ? "active" : ""}`} onClick={() => setResultTab("heightmap")}>
                HEIGHTMAP OUTPUT
              </button>
              <button
                className={`hf-hm-tab ${resultTab === "previews" ? "active" : ""}`}
                onClick={() => setResultTab("previews")}
                disabled={!blenderPreviews}
                title={!blenderPreviews ? "No preview renders for this job." : ""}
              >
                PREVIEW RENDERS {blenderStatus ? `• ${blenderStatus}` : ""}
              </button>
            </div>

            {resultTab === "heightmap" && previewImgSrc && (
              <div className="hf-hm-preview">
                <img src={previewImgSrc} alt="Heightmap preview" style={previewStyle} />
              </div>
            )}

            {resultTab === "previews" && (
              <div className="hf-hm-previews">
                {!blenderPreviews && (
                  <div className="hf-muted">
                    No preview renders found for this job (older job, or preview generation failed).
                  </div>
                )}

                {blenderPreviews && (
                  <div className="hf-hm-previews-grid">
                    <PreviewTile label="INSPECTION VIEWPORT A (HERO)" url={blenderPreviews.hero} bust={imgBust} />
                    <PreviewTile label="INSPECTION VIEWPORT B (ISO)" url={blenderPreviews.iso} bust={imgBust} />
                    <PreviewTile label="INSPECTION VIEWPORT C (TOP)" url={blenderPreviews.top} bust={imgBust} />
                    <PreviewTile label="INSPECTION VIEWPORT D (SIDE)" url={blenderPreviews.side} bust={imgBust} />
                  </div>
                )}
              </div>
            )}
          </div>

          <details className="hf-hm-raw">
            <summary>DIAGNOSTIC OUTPUT</summary>
            <pre>{JSON.stringify(resp, null, 2)}</pre>
          </details>
        </div>
      )}

      {/* PAST JOBS */}
      <div className="hf-hm-results">
        <div className="hf-hm-card">
          <div className="hf-hm-jobs-head">
            <h2>JOB ARCHIVE</h2>

            <div className="hf-hm-jobs-actions">
              <button className="hf-hm-btn small" onClick={() => refreshJobs({ resetPaging: true })} disabled={jobsLoading}>
                {jobsLoading ? "SYNCING…" : "↻ SYNC"}
              </button>
            </div>
          </div>

          {jobsError && <div className="hf-hm-error">{jobsError}</div>}

          {jobs.length === 0 && !jobsLoading && <div className="hf-muted">No archived jobs.</div>}

          <div className="hf-hm-jobs-list">
            {jobs.map((j) => {
              const pill = j.status || "unknown";
              const done = j.status === "done";
              const selected = selectedJobId === j.id;

              return (
                <div key={j.id} className={`hf-hm-jobrow ${selected ? "selected" : ""}`}>
                  <div className="hf-hm-jobmeta">
                    <div className="hf-hm-jobtitle">{(j.name || j.id || "").toUpperCase()}</div>
                    <div className="hf-hm-jobsub">
                      <span className={`hf-pill ${pill}`}>{pill.toUpperCase()}</span>
                      <span className="hf-muted">• {j.progress ?? 0}%</span>
                      <span className="hf-muted">• {fmtTime(j.created_at)}</span>
                    </div>
                    {j.error && <div className="hf-hm-joberr">{j.error}</div>}
                  </div>

                  <div className="hf-hm-jobbtns">
                    <button
                      className="hf-hm-btn small"
                      onClick={() => loadJob(j.id)}
                      disabled={!done || !!jobsError}
                      title={jobsError ? "Archive unavailable" : !done ? "Job not complete yet." : ""}
                    >
                      INSPECT
                    </button>
                    <button
                      className="hf-hm-btn small danger"
                      onClick={() => deleteJob(j.id)}
                      disabled={!!jobsError}
                      title={jobsError ? "Archive unavailable" : ""}
                    >
                      PURGE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hf-hm-more">
            <button
              className="hf-hm-btn"
              onClick={() =>
                refreshJobs({
                  resetPaging: false,
                  nextOffset: (jobsMeta.offset || 0) + (jobsMeta.limit || 10),
                })
              }
              disabled={jobsLoading || !canLoadMore}
            >
              {canLoadMore ? (jobsLoading ? "LOADING…" : "LOAD MORE") : "END OF ARCHIVE"}
            </button>

            <div className="hf-muted">
              DISPLAYING {jobs.length} / {jobsMeta.total || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTile({ label, url, bust }) {
  const [broken, setBroken] = useState(false);

  if (!url || broken) {
    return (
      <div className="hf-hm-preview-tile disabled">
        <div className="hf-hm-preview-title">{label}</div>
        <div className="hf-muted">{!url ? "MISSING" : "FAILED TO LOAD"}</div>
      </div>
    );
  }

  const src = `${url}${url.includes("?") ? "&" : "?"}${bust || ""}`;

  return (
    <a className="hf-hm-preview-tile" href={url} target="_blank" rel="noreferrer">
      <div className="hf-hm-preview-title">{label}</div>
      <div className="hf-hm-preview-thumb">
        <img src={src} alt={label} loading="lazy" onError={() => setBroken(true)} />
      </div>
    </a>
  );
}
