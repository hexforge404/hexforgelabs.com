import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  Download,
  FileDown,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  createSurfaceJob,
  getSurfaceJobStatus,
  getSurfaceManifest,
} from "../services/surfaceApi";
import "./SurfacePage.css";

const SURFACE_ASSET_BASE = (
  process.env.REACT_APP_SURFACE_ASSETS_URL || "/assets/surface"
).replace(/\/+$/, "");

function formatTs(value) {
  if (!value) return "";
  const ts = typeof value === "number" ? value * 1000 : value;
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(value);
  }
}

function resolveSurfaceUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  const raw = String(pathOrUrl).trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;

  if (raw.startsWith("/assets/surface/")) return raw;
  if (raw.startsWith("assets/surface/")) return `/${raw}`;

  const cleaned = raw.replace(/^\/+/g, "");
  if (cleaned.startsWith("assets/surface/")) {
    return `${SURFACE_ASSET_BASE}/${cleaned.replace(/^assets\/surface\//, "")}`;
  }

  if (cleaned.startsWith("surface/")) {
    return `${SURFACE_ASSET_BASE}/${cleaned.replace(/^surface\//, "")}`;
  }

  return `${SURFACE_ASSET_BASE}/${cleaned}`;
}

function defaultJobName() {
  const t = new Date();
  const iso = t.toISOString().replace(/[:.]/g, "-");
  return `relief-${iso}`;
}

export default function SurfacePage() {
  const [form, setForm] = useState({
    name: defaultJobName(),
    quality: "standard",
    notes: "",
  });

  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [timeoutHit, setTimeoutHit] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [previewBust, setPreviewBust] = useState(Date.now());

  const heroUrl = useMemo(() => {
    const u = manifest?.public?.previews?.hero;
    return u ? `${resolveSurfaceUrl(u)}?t=${previewBust}` : null;
  }, [manifest, previewBust]);

  const stlUrl = useMemo(() => resolveSurfaceUrl(manifest?.public?.enclosure?.stl), [manifest]);
  const textureUrl = useMemo(
    () => resolveSurfaceUrl(manifest?.public?.textures?.texture_png),
    [manifest]
  );
  const heightmapUrl = useMemo(
    () => resolveSurfaceUrl(manifest?.public?.textures?.heightmap_png),
    [manifest]
  );

  const statusLabel = jobStatus?.status || "idle";
  const progress = jobStatus?.progress ?? 0;

  const isComplete = statusLabel === "complete";
  const isFailed = statusLabel === "failed";

  useEffect(() => {
    if (!jobId || !polling) return undefined;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;

      const tooLong =
        typeof startedAt === "number" && Date.now() - startedAt > 5 * 60 * 1000;
      if (tooLong) {
        setTimeoutHit(true);
        setPolling(false);
        clearInterval(interval);
        return;
      }

      try {
        const statusResp = await getSurfaceJobStatus(jobId);
        if (cancelled) return;
        setJobStatus(statusResp);

        if (statusResp?.status === "complete") {
          setPolling(false);
          clearInterval(interval);
          const mf = await getSurfaceManifest(jobId);
          if (!cancelled) {
            setManifest(mf);
            setPreviewBust(Date.now());
          }
        } else if (statusResp?.status === "failed") {
          setPolling(false);
          clearInterval(interval);
          setError(statusResp?.error || "Surface job failed.");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Surface status check failed.");
        setPolling(false);
        clearInterval(interval);
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, polling, startedAt]);

  async function startJob() {
    setError("");
    setManifest(null);
    setTimeoutHit(false);
    setJobStatus(null);

    const payload = {
      name: form.name || defaultJobName(),
      quality: form.quality,
      notes: form.notes || "",
      mode: "relief",
    };

    setLoading(true);
    try {
      const data = await createSurfaceJob(payload);
      setJobId(data.job_id);
      setJobStatus({ status: "queued", progress: 0, job_id: data.job_id });
      setStartedAt(Date.now());
      setPolling(true);
    } catch (err) {
      setError(err?.message || "Surface request failed.");
    } finally {
      setLoading(false);
    }
  }

  const metadata = useMemo(() => {
    if (!manifest) return [];
    const meta = manifest.meta || manifest.metadata || {};
    return [
      { label: "Job", value: manifest.job_id || jobId || "" },
      { label: "Created", value: formatTs(meta.created_at || manifest.created_at) },
      { label: "Service", value: meta.service_version || manifest.service_version || "n/a" },
      { label: "Assets", value: SURFACE_ASSET_BASE },
    ];
  }, [manifest, jobId]);

  function resetJob() {
    setJobId("");
    setJobStatus(null);
    setManifest(null);
    setPolling(false);
    setTimeoutHit(false);
    setError("");
    setStartedAt(null);
    setPreviewBust(Date.now());
    setForm((prev) => ({ ...prev, name: defaultJobName() }));
  }

  return (
    <div className="surface-page">
      <div className="surface-header">
        <div>
          <p className="surface-eyebrow">GlyphEngine Surface</p>
          <h1>Generate Relief</h1>
          <p className="surface-lede">
            Launch a surface job, watch status in real-time, and grab previews and meshes
            directly from the assets bucket.
          </p>
        </div>
        <div className="surface-chip">
          <Sparkles size={18} />
          <span>Stabilized API</span>
        </div>
      </div>

      <div className="surface-grid">
        <section className="surface-card">
          <div className="surface-card-head">
            <div>
              <p className="surface-eyebrow">Job setup</p>
              <h2>Surface parameters</h2>
            </div>
            <button
              className="surface-button"
              onClick={startJob}
              disabled={loading}
              type="button"
            >
              {loading ? (
                <>
                  <RefreshCw className="spin" size={16} /> Running...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Generate Relief
                </>
              )}
            </button>
          </div>

          <div className="surface-form">
            <label className="surface-label">
              <span>Job name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="relief-2026-01-14"
              />
            </label>

            <label className="surface-label">
              <span>Quality</span>
              <select
                value={form.quality}
                onChange={(e) => setForm({ ...form, quality: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="standard">Standard</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="surface-label">
              <span>Notes (optional)</span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Describe the relief intent or leave blank"
              />
            </label>
          </div>

          {error && (
            <div className="surface-alert surface-alert-error">
              <AlertTriangle size={18} />
              <div>
                <p className="surface-alert-title">Surface error</p>
                <p className="surface-alert-body">{error}</p>
              </div>
              {timeoutHit && (
                <button className="surface-link" onClick={resetJob} type="button">
                  Try again
                </button>
              )}
            </div>
          )}

          {timeoutHit && !error && (
            <div className="surface-alert surface-alert-warn">
              <Clock3 size={18} />
              <div>
                <p className="surface-alert-title">Polling timed out</p>
                <p className="surface-alert-body">
                  The job has been running for more than five minutes. You can retry or keep this
                  page open while the engine finishes.
                </p>
              </div>
              <button className="surface-link" onClick={resetJob} type="button">
                Try again
              </button>
            </div>
          )}
        </section>

        <section className="surface-card">
          <div className="surface-card-head">
            <div>
              <p className="surface-eyebrow">Live status</p>
              <h2>Pipeline monitor</h2>
            </div>
            {jobId && (
              <span className="surface-chip surface-chip-ghost">{jobId}</span>
            )}
          </div>

          <div className="surface-status-row">
            <div className={`surface-status surface-status-${statusLabel}`}>
              {statusLabel}
            </div>
            <div className="surface-progress">
              <div className="surface-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span className="surface-progress-text">{progress}%</span>
          </div>

          <div className="surface-status-grid">
            <div>
              <p className="surface-k">State</p>
              <p className="surface-v">{statusLabel}</p>
            </div>
            <div>
              <p className="surface-k">Started</p>
              <p className="surface-v">{startedAt ? formatTs(startedAt) : "—"}</p>
            </div>
            <div>
              <p className="surface-k">Assets root</p>
              <p className="surface-v">{SURFACE_ASSET_BASE}/</p>
            </div>
            <div>
              <p className="surface-k">Polling</p>
              <p className="surface-v">{polling ? "active" : "idle"}</p>
            </div>
          </div>
        </section>

        <section className="surface-card">
          <div className="surface-card-head">
            <div>
              <p className="surface-eyebrow">Preview</p>
              <h2>Hero render</h2>
            </div>
            {!heroUrl && <span className="surface-chip surface-chip-ghost">Waiting</span>}
          </div>

          {heroUrl ? (
            <div className="surface-preview">
              <img src={heroUrl} alt="Surface hero preview" />
            </div>
          ) : (
            <div className="surface-placeholder">
              <ImageIcon size={22} />
              <p>Preview will appear once the job finishes.</p>
            </div>
          )}
        </section>

        <section className="surface-card">
          <div className="surface-card-head">
            <div>
              <p className="surface-eyebrow">Outputs</p>
              <h2>Downloads</h2>
            </div>
            {isComplete && <span className="surface-chip surface-chip-success">Complete</span>}
          </div>

          <div className="surface-downloads">
            <button
              className="surface-download"
              type="button"
              onClick={() => stlUrl && window.open(stlUrl, "_blank")}
              disabled={!stlUrl}
            >
              <FileDown size={18} />
              <div>
                <p>Enclosure STL</p>
                <span>{stlUrl ? "Download" : "Pending"}</span>
              </div>
              <Download size={16} />
            </button>

            <button
              className="surface-download"
              type="button"
              onClick={() => textureUrl && window.open(textureUrl, "_blank")}
              disabled={!textureUrl}
            >
              <FileDown size={18} />
              <div>
                <p>Texture PNG</p>
                <span>{textureUrl ? "Download" : "Pending"}</span>
              </div>
              <Download size={16} />
            </button>

            <button
              className="surface-download"
              type="button"
              onClick={() => heightmapUrl && window.open(heightmapUrl, "_blank")}
              disabled={!heightmapUrl}
            >
              <FileDown size={18} />
              <div>
                <p>Heightmap PNG</p>
                <span>{heightmapUrl ? "Download" : "Pending"}</span>
              </div>
              <Download size={16} />
            </button>
          </div>
        </section>

        <section className="surface-card">
          <div className="surface-card-head">
            <div>
              <p className="surface-eyebrow">Manifest</p>
              <h2>Metadata</h2>
            </div>
          </div>

          <details className="surface-details" open>
            <summary>Created + service version</summary>
            {metadata.length > 0 ? (
              <div className="surface-meta-grid">
                {metadata.map((row) => (
                  <div key={row.label} className="surface-meta-row">
                    <span className="surface-k">{row.label}</span>
                    <span className="surface-v">{row.value || ""}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="surface-muted">Manifest will appear once the job completes.</p>
            )}
          </details>

          {manifest && (
            <details className="surface-details">
              <summary>Raw manifest</summary>
              <pre>{JSON.stringify(manifest, null, 2)}</pre>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
