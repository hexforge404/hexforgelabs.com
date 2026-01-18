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

// Phase 0 findings (2026-01-18): nginx serves /api/heightmap and /api/surface plus assets; heightmap flow returns public.heightmap_url; /surface currently posts only name/quality/notes with no heightmap selector.

const SURFACE_ASSET_BASE = (
  process.env.REACT_APP_SURFACE_ASSETS_URL || "/assets/surface"
).replace(/\/+$/, "");

const HEIGHTMAP_API_BASE = (
  process.env.REACT_APP_HEIGHTMAP_API_BASE || "/api/heightmap"
).replace(/\/+$/, "");

const HEIGHTMAP_ASSET_BASE = (
  process.env.REACT_APP_HEIGHTMAP_ASSETS_URL || "/assets/heightmap"
).replace(/\/+$/, "");

const HEIGHTMAP_API_KEY = process.env.REACT_APP_HEIGHTMAP_API_KEY || "";
const HEIGHTMAP_STORAGE_KEY = "surface:selectedHeightmapJobId";
const IS_DEV = process.env.NODE_ENV !== "production";

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

function normalizeOutputUrl(output) {
  const candidate =
    output?.url ||
    output?.public_url ||
    output?.href ||
    output?.path ||
    output?.file ||
    null;

  if (!candidate) return null;
  return resolveSurfaceUrl(candidate);
}

function deriveOutputs(manifest) {
  const rawList = Array.isArray(manifest?.outputs) ? manifest.outputs : [];
  const list = rawList.map((o) => ({ ...o, url: normalizeOutputUrl(o) }));

  const findFirst = (fn) => {
    for (const o of list) {
      if (fn(o)) return o;
    }
    return null;
  };

  const preview = findFirst((o) => {
    const t = (o.type || "").toLowerCase();
    const name = (o.name || o.label || "").toLowerCase();
    return t === "preview" || name.includes("preview") || name.includes("hero");
  });

  const stl = findFirst((o) => {
    const t = (o.type || "").toLowerCase();
    const name = (o.name || o.label || o.url || "").toLowerCase();
    return t === "stl" || name.endsWith(".stl");
  });

  const texture = findFirst((o) => {
    const t = (o.type || "").toLowerCase();
    const name = (o.name || o.label || o.url || "").toLowerCase();
    return t === "texture" || name.includes("texture") || name.endsWith(".png");
  });

  const heightmap = findFirst((o) => {
    const t = (o.type || "").toLowerCase();
    const name = (o.name || o.label || o.url || "").toLowerCase();
    return t === "heightmap" || name.includes("heightmap");
  });

  return {
    list,
    heroUrl: preview?.url || null,
    stlUrl: stl?.url || null,
    textureUrl: texture?.url || null,
    heightmapUrl: heightmap?.url || null,
  };
}

function resolveHeightmapUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  const raw = String(pathOrUrl).trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;

  if (raw.startsWith("/assets/heightmap/")) {
    const rel = raw.replace(/^\/assets\/heightmap\//, "");
    return rel ? `${HEIGHTMAP_ASSET_BASE}/${rel}` : null;
  }

  if (raw.startsWith("assets/heightmap/")) {
    const rel = raw.replace(/^assets\/heightmap\//, "");
    return rel ? `${HEIGHTMAP_ASSET_BASE}/${rel}` : null;
  }

  return `${HEIGHTMAP_ASSET_BASE}/${raw.replace(/^\/+/, "")}`;
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
  const [manifestUrl, setManifestUrl] = useState("");
  const [outputs, setOutputs] = useState({ list: [], heroUrl: null, stlUrl: null, textureUrl: null, heightmapUrl: null });
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [timeoutHit, setTimeoutHit] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [previewBust, setPreviewBust] = useState(Date.now());

  const [heightmapJobs, setHeightmapJobs] = useState([]);
  const [heightmapLoading, setHeightmapLoading] = useState(false);
  const [heightmapError, setHeightmapError] = useState("");
  const [selectedHeightmapId, setSelectedHeightmapId] = useState("");

  const heroUrl = useMemo(() => {
    return outputs.heroUrl ? `${outputs.heroUrl}?t=${previewBust}` : null;
  }, [outputs.heroUrl, previewBust]);

  const stlUrl = useMemo(() => outputs.stlUrl, [outputs.stlUrl]);
  const textureUrl = useMemo(() => outputs.textureUrl, [outputs.textureUrl]);
  const heightmapUrl = useMemo(() => outputs.heightmapUrl, [outputs.heightmapUrl]);

  const selectedHeightmap = useMemo(
    () => heightmapJobs.find((j) => j.id === selectedHeightmapId) || null,
    [heightmapJobs, selectedHeightmapId]
  );

  const selectedHeightmapPreview = useMemo(() => {
    return selectedHeightmap?.previewUrl || selectedHeightmap?.heightmapUrl || null;
  }, [selectedHeightmap]);

  const statusLabel = jobStatus?.status || "idle";
  const progress = jobStatus?.progress ?? 0;

  const isComplete = statusLabel === "complete";
  const isFailed = statusLabel === "failed";
  const missingOutputs = isComplete && outputs.list.length === 0;

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
          const manifestUrlFromStatus = statusResp.manifest_url || statusResp.manifest?.manifest_url || "";

          let mf = statusResp.manifest || null;

          if (!mf) {
            try {
              mf = await getSurfaceManifest(jobId);
            } catch (e) {
              setError(e?.message || "Manifest fetch failed.");
              return;
            }
          }

          if (!mf) {
            setError("Manifest missing after job completion.");
            return;
          }

          const resolvedManifestUrl = manifestUrlFromStatus || mf.manifest_url || mf.meta?.manifest_url || "";
          const derived = deriveOutputs(mf);
          setManifestUrl(resolvedManifestUrl);
          setManifest(mf);
          setOutputs(derived);
          setPreviewBust(Date.now());

          if (!derived.heroUrl && !derived.stlUrl && !derived.textureUrl) {
            setError("Job completed but manifest outputs are missing.");
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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HEIGHTMAP_STORAGE_KEY) || "";
      if (stored) setSelectedHeightmapId(stored);
    } catch (e) {
      console.warn("surface: localStorage unavailable", e);
    }
  }, []);

  useEffect(() => {
    refreshHeightmapJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshHeightmapJobs() {
    setHeightmapLoading(true);
    setHeightmapError("");
    try {
      const res = await fetch(`${HEIGHTMAP_API_BASE}/v1/jobs?limit=25&offset=0`, {
        headers: HEIGHTMAP_API_KEY ? { "x-api-key": HEIGHTMAP_API_KEY } : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.detail || data?.error || `Heightmap jobs fetch failed (${res.status})`);
      }

      const items = (data.jobs?.items || [])
        .filter((job) => {
          const status = String(job.status || "").toLowerCase();
          return status === "done" || status === "complete" || status === "completed";
        })
        .map((job) => {
          const pub = job.result?.public || job.public || {};
          const previews = pub.blender_previews_urls || pub.previews || {};
          const hero = previews.hero || previews.iso || previews.top || previews.side || pub.heightmap_url;
          const heightmapUrl = resolveHeightmapUrl(pub.heightmap_url || job.result?.heightmap);
          return {
            id: job.id,
            name: job.name || job.id,
            status: job.status,
            created_at: job.created_at,
            updated_at: job.updated_at,
            heightmapUrl,
            previewUrl: resolveHeightmapUrl(hero || ""),
          };
        });

      setHeightmapJobs(items);

      const preferredId = (() => {
        if (selectedHeightmapId && items.some((j) => j.id === selectedHeightmapId)) {
          return selectedHeightmapId;
        }
        try {
          const stored = window.localStorage.getItem(HEIGHTMAP_STORAGE_KEY);
          if (stored && items.some((j) => j.id === stored)) return stored;
        } catch {
          /* ignore */
        }
        return items[0]?.id || "";
      })();

      if (preferredId) {
        setSelectedHeightmapId(preferredId);
        try {
          window.localStorage.setItem(HEIGHTMAP_STORAGE_KEY, preferredId);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setHeightmapError(err?.message || "Failed to load heightmap jobs.");
      setHeightmapJobs([]);
    } finally {
      setHeightmapLoading(false);
    }
  }

  async function startJob() {
    setError("");
    setManifest(null);
    setManifestUrl("");
    setOutputs({ list: [], heroUrl: null, stlUrl: null, textureUrl: null, heightmapUrl: null });
    setTimeoutHit(false);
    setJobStatus(null);

    if (!selectedHeightmap || !selectedHeightmap.heightmapUrl) {
      setError("Select a completed heightmap first.");
      return;
    }

    const payload = {
      name: form.name || defaultJobName(),
      quality: form.quality,
      notes: form.notes || "",
      mode: "relief",
      source_heightmap_url: selectedHeightmap.heightmapUrl,
      source_heightmap_job_id: selectedHeightmap.id,
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
      { label: "Manifest", value: manifestUrl || "" },
      { label: "Heightmap", value: selectedHeightmap?.name || "none" },
    ];
  }, [manifest, jobId, selectedHeightmap, manifestUrl]);

  function resetJob() {
    setJobId("");
    setJobStatus(null);
    setManifest(null);
    setManifestUrl("");
    setOutputs({ list: [], heroUrl: null, stlUrl: null, textureUrl: null, heightmapUrl: null });
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
          {/* Engine Identity: consumes heightmaps to produce modular, functional enclosure geometry (Raspberry Pi-first). */}
          <p className="surface-eyebrow">Surface Engine</p>
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
            <div className="surface-heightmap-box">
              <div className="surface-label">
                <span>Input heightmap</span>
                <div className="surface-heightmap-row">
                  <select
                    value={selectedHeightmapId}
                    onChange={(e) => {
                      setSelectedHeightmapId(e.target.value);
                      try {
                        window.localStorage.setItem(HEIGHTMAP_STORAGE_KEY, e.target.value);
                      } catch {
                        /* ignore */
                      }
                    }}
                    disabled={heightmapLoading || loading || heightmapJobs.length === 0}
                  >
                    {heightmapJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.name} - {formatTs(job.updated_at || job.created_at)}
                      </option>
                    ))}
                    {heightmapJobs.length === 0 && <option value="">No completed heightmaps found</option>}
                  </select>
                  <button
                    type="button"
                    className="surface-button surface-button-ghost"
                    onClick={refreshHeightmapJobs}
                    disabled={heightmapLoading}
                  >
                    {heightmapLoading ? (
                      <>
                        <RefreshCw className="spin" size={14} /> Refreshing
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} /> Refresh
                      </>
                    )}
                  </button>
                </div>
                <p className="surface-muted">
                  Shows completed heightmaps from the Heightmap tool. Create one if empty.
                </p>
                {heightmapError && <p className="surface-inline-error">{heightmapError}</p>}
              </div>

              <div className="surface-heightmap-preview">
                {selectedHeightmapPreview ? (
                  <img src={selectedHeightmapPreview} alt="Selected heightmap preview" />
                ) : (
                  <div className="surface-placeholder">
                    <ImageIcon size={18} />
                    <p>Select a completed heightmap to preview.</p>
                  </div>
                )}
              </div>
            </div>

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
              {missingOutputs && <p className="surface-inline-error">Manifest missing preview output.</p>}
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

          {missingOutputs && (
            <div className="surface-alert surface-alert-warn" style={{ marginBottom: "0.75rem" }}>
              <AlertTriangle size={18} />
              <div>
                <p className="surface-alert-title">Outputs missing</p>
                <p className="surface-alert-body">Job completed but manifest outputs are missing or empty.</p>
              </div>
            </div>
          )}

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
                <span>{stlUrl ? "Download" : missingOutputs ? "Missing from manifest" : "Unavailable"}</span>
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
                <span>{textureUrl ? "Download" : missingOutputs ? "Missing from manifest" : "Unavailable"}</span>
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
                <span>{heightmapUrl ? "Download" : missingOutputs ? "Missing from manifest" : "Unavailable"}</span>
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

          {IS_DEV && (
            <details className="surface-details">
              <summary>Debug (dev-only)</summary>
              <div className="surface-meta-grid">
                <div className="surface-meta-row">
                  <span className="surface-k">Job ID</span>
                  <span className="surface-v">{jobId || ""}</span>
                </div>
                <div className="surface-meta-row">
                  <span className="surface-k">Manifest URL</span>
                  <span className="surface-v">{manifestUrl || ""}</span>
                </div>
              </div>

              {outputs.list.length > 0 ? (
                <div className="surface-meta-grid">
                  {outputs.list.map((o, idx) => (
                    <div key={`${o.type || "out"}-${idx}`} className="surface-meta-row">
                      <span className="surface-k">{o.type || o.name || `output-${idx}`}</span>
                      <span className="surface-v">{o.url || "(no url)"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="surface-muted">No manifest outputs yet.</p>
              )}
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
