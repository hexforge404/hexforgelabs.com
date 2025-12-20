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

function toHeightmapAssetUrl(enginePathOrUrl) {
  if (!enginePathOrUrl) return null;
  const s = String(enginePathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
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

export default function HeightmapPage() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState(makeDefaultName());

  // Advanced options
  const [mode, setMode] = useState("relief");
  const [maxHeight, setMaxHeight] = useState(4.0);
  const [invert, setInvert] = useState(true);
  const [sizeMm, setSizeMm] = useState(80);
  const [thickness, setThickness] = useState(2.0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resp, setResp] = useState(null);

  const [jobStatus, setJobStatus] = useState(null); // {id,status,progress}

  // Past jobs
  const [jobs, setJobs] = useState([]);
  const [jobsMeta, setJobsMeta] = useState({ total: 0, limit: 10, offset: 0 });
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");

  const result = useMemo(() => resp?.result || resp || null, [resp]);

  const previewUrl = useMemo(() => toHeightmapAssetUrl(result?.heightmap), [result]);
  const stlUrl = useMemo(() => toHeightmapAssetUrl(result?.stl), [result]);
  const manifestUrl = useMemo(() => toHeightmapAssetUrl(result?.manifest), [result]);

  async function pollJob(statusUrl, timeoutMs = 10 * 60 * 1000) {
    const start = Date.now();

    while (true) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("Timed out waiting for the job to finish.");
      }

      const { r, data } = await safeJsonFetch(`${TOOLS_BASE}${statusUrl}`, { method: "GET" });

      if (!r.ok || !data?.ok) {
        const msg = pickFastApiError(data, `Status check failed (${r.status})`);
        throw new Error(msg);
      }

      const job = data.job;
      setJobStatus({ id: job.id, status: job.status, progress: job.progress ?? 0 });

      if (job.status === "done") return job;
      if (job.status === "failed") throw new Error(job.error || "Job failed.");

      // slightly slower polling = nicer on mobile + Cloudflare
      await new Promise((res) => setTimeout(res, 1500));
    }
  }

  async function generate() {
    setError("");
    setResp(null);
    setJobStatus(null);

    if (!file) return setError("Select an image first.");
    if (!name.trim()) return setError("Name is required.");
    if (!TOOLS_BASE) {
      return setError("Tools base URL not configured. Set REACT_APP_TOOLS_BASE_URL.");
    }

    const fd = new FormData();
    fd.append("image", file);
    fd.append("name", name.trim());
    fd.append("mode", mode);
    fd.append("max_height", String(maxHeight));
    fd.append("invert", String(invert));
    fd.append("size_mm", String(sizeMm));
    fd.append("thickness", String(thickness));

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

      // refresh past jobs after completion
      await refreshJobs(true);
    } catch (e) {
      setError(e?.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setName(makeDefaultName());
    setMode("relief");
    setMaxHeight(4.0);
    setInvert(true);
    setSizeMm(80);
    setThickness(2.0);
    setResp(null);
    setError("");
    setJobStatus(null);
  }

  async function refreshJobs(resetPaging = false) {
    if (!TOOLS_BASE) return;

    setJobsLoading(true);
    setJobsError("");

    try {
      const limit = 10;
      const offset = resetPaging ? 0 : jobsMeta.offset;

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

      if (resetPaging) {
        setJobs(pack.items || []);
      } else {
        setJobs((prev) => [...prev, ...(pack.items || [])]);
      }
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

    // remove from UI
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  useEffect(() => {
    // load first page once
    refreshJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canLoadMore = jobs.length < (jobsMeta.total || 0);

  return (
    <div className="hf-hm-page">
      <div className="hf-hm-header">
        <h1>Heightmap STL Generator</h1>
        <p>Upload an image → generate STL + manifest + preview (job-based, Cloudflare-safe).</p>
      </div>

      <div className="hf-hm-card">
        <div className="hf-hm-grid">
          <label className="hf-hm-label">
            <span>Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <label className="hf-hm-label">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="hexforge_logo_relief"
            />
          </label>
        </div>

        <details className="hf-hm-raw">
          <summary>Advanced settings</summary>

          <div className="hf-hm-grid">
            <label className="hf-hm-label">
              <span>Mode</span>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="relief">relief</option>
                <option value="engrave">engrave</option>
              </select>
            </label>

            <label className="hf-hm-label">
              <span>Max Height (mm)</span>
              <input
                type="number"
                step="0.1"
                value={maxHeight}
                onChange={(e) => setMaxHeight(Number(e.target.value))}
              />
            </label>

            <label className="hf-hm-label">
              <span>Size (mm)</span>
              <input
                type="number"
                step="1"
                value={sizeMm}
                onChange={(e) => setSizeMm(Number(e.target.value))}
              />
            </label>

            <label className="hf-hm-label">
              <span>Thickness (mm)</span>
              <input
                type="number"
                step="0.1"
                value={thickness}
                onChange={(e) => setThickness(Number(e.target.value))}
              />
            </label>

            <label className="hf-hm-label hf-hm-check">
              <span>Invert</span>
              <input
                type="checkbox"
                checked={invert}
                onChange={(e) => setInvert(e.target.checked)}
              />
            </label>
          </div>
        </details>

        <div className="hf-hm-actions">
          <button className="hf-hm-btn primary" onClick={generate} disabled={loading}>
            {loading ? `Generating… ${jobStatus?.progress ?? 0}%` : "Generate"}
          </button>

          <button className="hf-hm-btn" onClick={reset} disabled={loading}>
            Reset
          </button>

          {(jobStatus || resp?.job) && (
            <div className="hf-hm-jobline">
              <span className={`hf-pill ${jobStatus?.status || resp?.job?.status || "unknown"}`}>
                {(jobStatus?.status || resp?.job?.status) ?? "unknown"}
              </span>
              <span className="hf-hm-jobtext">
                Job • {(jobStatus?.progress ?? resp?.job?.progress ?? 0)}%
              </span>
            </div>
          )}

          {error && <div className="hf-hm-error">{error}</div>}
        </div>
      </div>

      {/* Current Result */}
      {resp && (
        <div className="hf-hm-results">
          <div className="hf-hm-card">
            <div className="hf-hm-links">
              {stlUrl && (
                <a className="hf-hm-link" href={stlUrl} download>
                  ⬇ Download STL
                </a>
              )}
              {manifestUrl && (
                <a className="hf-hm-link" href={manifestUrl} download>
                  ⬇ Download Manifest
                </a>
              )}
              {previewUrl && (
                <a className="hf-hm-link" href={previewUrl} target="_blank" rel="noreferrer">
                  👁 Open Preview
                </a>
              )}
            </div>

            {previewUrl && (
              <div className="hf-hm-preview">
                <img src={previewUrl} alt="Heightmap preview" />
              </div>
            )}
          </div>

          <details className="hf-hm-raw">
            <summary>Raw API response</summary>
            <pre>{JSON.stringify(resp, null, 2)}</pre>
          </details>
        </div>
      )}

      {/* Past Jobs */}
      <div className="hf-hm-results">
        <div className="hf-hm-card">
          <div className="hf-hm-jobs-head">
            <h2>Past jobs</h2>

            <div className="hf-hm-jobs-actions">
              <button className="hf-hm-btn small" onClick={() => refreshJobs(true)} disabled={jobsLoading}>
                {jobsLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {jobsError && <div className="hf-hm-error">{jobsError}</div>}

          {jobs.length === 0 && !jobsLoading && <div className="hf-muted">No jobs yet.</div>}

          <div className="hf-hm-jobs-list">
            {jobs.map((j) => {
              const pill = j.status || "unknown";
              const done = j.status === "done";
              return (
                <div key={j.id} className="hf-hm-jobrow">
                  <div className="hf-hm-jobmeta">
                    <div className="hf-hm-jobtitle">{j.name || j.id}</div>
                    <div className="hf-hm-jobsub">
                      <span className={`hf-pill ${pill}`}>{pill}</span>
                      <span className="hf-muted">• {j.progress ?? 0}%</span>
                      <span className="hf-muted">• {fmtTime(j.created_at)}</span>
                    </div>
                    {j.error && <div className="hf-hm-joberr">{j.error}</div>}
                  </div>

                  <div className="hf-hm-jobbtns">
                    <button className="hf-hm-btn small" onClick={() => loadJob(j.id)} disabled={!done}>
                      View
                    </button>
                    <button className="hf-hm-btn small danger" onClick={() => deleteJob(j.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hf-hm-more">
            <button
              className="hf-hm-btn"
              onClick={() => {
                setJobsMeta((m) => ({ ...m, offset: (m.offset || 0) + (m.limit || 10) }));
                // load next page using updated offset after state settles
                setTimeout(() => refreshJobs(false), 0);
              }}
              disabled={jobsLoading || !canLoadMore}
            >
              {canLoadMore ? (jobsLoading ? "Loading…" : "Load more") : "No more"}
            </button>

            <div className="hf-muted">
              Showing {jobs.length} / {jobsMeta.total || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
