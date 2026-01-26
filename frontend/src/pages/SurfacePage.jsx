import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
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
  getSurfaceLatest,
  getHeightmapLatest,
} from "../services/surfaceApi";
import { useAdmin } from "../context/AdminContext";
import "./SurfacePage.css";

// Phase 0 findings (2026-01-18): nginx serves /api/heightmap and /api/surface plus assets; heightmap flow returns public.heightmap_url; /surface currently posts only name/quality/notes with no heightmap selector.

const SURFACE_ASSET_BASE = (
  process.env.REACT_APP_SURFACE_ASSETS_URL || "/assets/surface"
).replace(/\/+$/, "");

const HEIGHTMAP_ASSET_BASE = (
  process.env.REACT_APP_HEIGHTMAP_ASSETS_URL || "/assets/heightmap"
).replace(/\/+$/, "");

const HEIGHTMAP_STORAGE_KEY = "surface:selectedHeightmapJobId";
const IS_DEV = process.env.NODE_ENV !== "production";
const DEBUG_QUERY = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
const DEBUG_MODE = IS_DEV || DEBUG_QUERY.get("debug") === "1";

const FALLBACK_PROGRESS = {
  idle: 0,
  queued: 10,
  running: 60,
  writing: 85,
  complete: 100,
  failed: 0,
};

function normalizeState(status) {
  const map = {
    queued: "queued",
    pending: "queued",
    waiting: "queued",
    running: "running",
    processing: "running",
    executing: "running",
    writing: "writing",
    finalizing: "writing",
    complete: "complete",
    completed: "complete",
    done: "complete",
    failed: "failed",
    error: "failed",
  };
  const key = String(status || "").toLowerCase();
  return map[key] || key || "idle";
}

function deriveProgress(state, rawProgress) {
  if (Number.isFinite(rawProgress)) {
    return Math.min(100, Math.max(0, Math.round(rawProgress)));
  }
  return FALLBACK_PROGRESS[state] ?? 0;
}

function formatTs(value) {
  if (value === null || value === undefined || value === "") return "—";

  const coerceDate = (maybeTs) => {
    const date = new Date(maybeTs);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  };

  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    return coerceDate(ms) || String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const ms = numeric < 1e12 ? numeric * 1000 : numeric;
      return coerceDate(ms) || trimmed;
    }

    return coerceDate(trimmed) || trimmed;
  }

  return String(value);
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

function resolveOutputUrl(output, manifest) {
  const publicRoot = (manifest?.public_root || manifest?.public?.public_root || manifest?.public_root_url || "")
    .replace(/\/+$/, "");

  const candidate =
    output?.url ||
    output?.public_url ||
    output?.href ||
    output?.path ||
    output?.file ||
    null;

  if (!candidate) return null;

  const raw = String(candidate).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/assets/surface/")) return raw;

  const rel = raw.replace(/^\/+/, "");
  if (publicRoot) return `${publicRoot}/${rel}`;
  return `${SURFACE_ASSET_BASE}/${rel}`;
}

function deriveSubfolderFromUrl(manifestObj, manifestUrl, jobId) {
  if (manifestObj?.subfolder) return manifestObj.subfolder;
  const url = manifestUrl || "";
  const parts = url.split("/").filter(Boolean);
  const idx = parts.indexOf("surface");
  if (idx >= 0) {
    const maybeSubfolder = parts[idx + 1];
    const maybeJob = parts[idx + 2];
    if (maybeJob === jobId) return maybeSubfolder || "";
  }
  return "";
}

function computeAssetsRoot(manifest) {
  if (manifest?.assetsRoot) return manifest.assetsRoot;

  const pub = manifest?.public || {};
  const candidates = [manifest?.public_root, pub.public_root, manifest?.public_root_url].filter(Boolean);
  if (candidates.length > 0) {
    return String(candidates[0]).replace(/\/+$/, "");
  }

  if (manifest?.subfolder) {
    return `${SURFACE_ASSET_BASE}/${manifest.subfolder}`.replace(/\/+$/, "");
  }
  return "";
}

function resolvePreviewsFromManifest(manifest) {
  const previews = manifest?.public?.previews || manifest?.public?.blender_previews_urls || {};
  const publicRoot = (manifest?.public_root || manifest?.public?.public_root || "").replace(/\/+$/, "");
  const pick = (key) => {
    const raw = previews?.[key];
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("/assets/surface/")) return raw;
    if (publicRoot) return `${publicRoot}/${raw.replace(/^\/+/, "")}`;
    return resolveSurfaceUrl(raw);
  };
  return {
    hero: pick("hero"),
    iso: pick("iso"),
    top: pick("top"),
    side: pick("side"),
  };
}

function deriveOutputs(manifest, jobId, manifestUrlHint = "") {
  const effectiveJobId = (() => {
    if (manifest?.job_id || manifest?.jobId) return manifest.job_id || manifest.jobId;
    const url = manifestUrlHint || "";
    const parts = url.split("/").filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2];
    return jobId;
  })();

  const rawList = Array.isArray(manifest?.outputs)
    ? manifest.outputs
    : manifest?.outputs && typeof manifest.outputs === "object"
      ? Object.entries(manifest.outputs).map(([type, val]) => {
          if (val && typeof val === "object") return { type, ...val };
          return { type, url: val };
        })
      : [];
  const list = rawList.map((o) => ({ ...o, url: resolveOutputUrl(o, manifest) }));

  const outputsByType = {};
  list.forEach((o) => {
    const key = (o.type || "").toLowerCase();
    if (key && !outputsByType[key]) {
      outputsByType[key] = o;
    }
  });

  const findFirst = (fn) => {
    for (const o of list) {
      if (fn(o)) return o;
    }
    return null;
  };

  const candidateLabel = (o) => (o.url || o.path || o.public_url || o.name || o.label || "").toLowerCase();

  const manifestPreviews = resolvePreviewsFromManifest(manifest);

  const preview =
    outputsByType.hero_png ||
    outputsByType.preview ||
    findFirst((o) => {
      const name = (o.name || o.label || "").toLowerCase();
      const type = (o.type || "").toLowerCase();
      return name.includes("preview") || name.includes("hero") || type.includes("preview") || type.includes("hero");
    }) ||
    (manifestPreviews.hero
      ? { url: manifestPreviews.hero, type: "preview.hero" }
      : null);

  const productStl =
    outputsByType.product_stl ||
    findFirst((o) => {
      const name = (o.name || o.label || o.url || "").toLowerCase();
      const type = (o.type || "").toLowerCase();
      return type === "product_stl" || name.includes("product") || name.endsWith("product.stl");
    });

  const stl =
    productStl ||
    outputsByType.stl ||
    findFirst((o) => {
      const name = (o.name || o.label || o.url || "").toLowerCase();
      const type = (o.type || "").toLowerCase();
      return name.endsWith(".stl") || name.includes("stl") || type.includes("stl");
    });

  const texture =
    outputsByType.texture ||
    outputsByType.albedo ||
    findFirst((o) => {
      const name = (o.name || o.label || o.url || "").toLowerCase();
      const type = (o.type || "").toLowerCase();
      return name.includes("texture") || name.endsWith(".png") || type.includes("texture") || type.includes("albedo");
    });

  const heightmap =
    outputsByType.heightmap ||
    findFirst((o) => {
      const name = (o.name || o.label || o.url || "").toLowerCase();
      const type = (o.type || "").toLowerCase();
      return name.includes("heightmap") || type.includes("heightmap");
    });

  let heroUrl = preview?.url || manifestPreviews.hero || null;

  if (!heroUrl && manifest?.public_root) {
    const base = manifest.public_root.replace(/\/$/, "");
    heroUrl = `${base}/previews/hero.png`;
  }

  if (!heroUrl && manifest?.subfolder && effectiveJobId) {
    heroUrl = `${SURFACE_ASSET_BASE}/${manifest.subfolder}/${effectiveJobId}/previews/hero.png`;
  }

  if (!heroUrl && effectiveJobId) {
    heroUrl = `${SURFACE_ASSET_BASE}/${effectiveJobId}/previews/hero.png`;
  }

  // If we have a preview URL but it lacks the job-specific path, rewrite using subfolder/jobId when available, unless public_root already handled.
  const hasPublicRoot = !!manifest?.public_root;
  if (!hasPublicRoot && heroUrl && manifest?.subfolder && effectiveJobId && !heroUrl.includes(`/${manifest.subfolder}/${effectiveJobId}/`)) {
    heroUrl = `${SURFACE_ASSET_BASE}/${manifest.subfolder}/${effectiveJobId}/previews/hero.png`;
  }
  if (!hasPublicRoot && heroUrl && effectiveJobId && !heroUrl.includes(`/${effectiveJobId}/`)) {
    heroUrl = `${SURFACE_ASSET_BASE}/${effectiveJobId}/previews/hero.png`;
  }

  const caseBase =
    outputsByType.case_base ||
    outputsByType.pi4b_case_base ||
    findFirst((o) => {
      const name = candidateLabel(o);
      return /case[_-]?base/.test(name) && name.includes(".stl");
    });

  const caseLid =
    outputsByType.case_lid ||
    outputsByType.pi4b_case_lid ||
    findFirst((o) => {
      const name = candidateLabel(o);
      return /case[_-]?lid/.test(name) && name.includes(".stl");
    });

  const pi4bPanel =
    outputsByType.pi4b_case_panel ||
    findFirst((o) => {
      const name = (o.name || o.label || o.url || "").toLowerCase();
      return name.includes("pi4b_case_panel.stl") || name.includes("case_panel.stl") || name.includes("pi4b_case_panel");
    });

  return {
    list,
    heroUrl: heroUrl || null,
    stlUrl: stl?.url || null,
    productStlUrl: productStl?.url || stl?.url || null,
    textureUrl: texture?.url || null,
    heightmapUrl: heightmap?.url || null,
    caseBaseUrl: caseBase?.url || null,
    caseLidUrl: caseLid?.url || null,
    casePanelUrl: pi4bPanel?.url || null,
  };
}

function summarizeMissingOutputs(derived, target, { includeOptional = false } = {}) {
  const missing = [];
  const outputsList = Array.isArray(derived?.list) ? derived.list : [];
  const normalizedTarget = String(target || "").toLowerCase();
  const hasHero = !!derived?.heroUrl;

  const hasMatch = (matcher) => {
    return outputsList.some((o) => {
      const candidate = (o?.url || o?.path || o?.public_url || o?.name || o?.label || "").toLowerCase();
      return matcher(candidate);
    });
  };

  if (!hasHero) missing.push("preview missing");

  if (normalizedTarget === "board_case" || normalizedTarget.endsWith("_case")) {
    const basePresent =
      !!derived?.caseBaseUrl ||
      hasMatch((val) => /case[_-]?base.*\.stl/.test(val));
    const lidPresent =
      !!derived?.caseLidUrl ||
      hasMatch((val) => /case[_-]?lid.*\.stl/.test(val));

    if (!basePresent) missing.push("case base missing");
    if (!lidPresent) missing.push("case lid missing");
  } else {
    const stlPresent =
      (!!derived?.stlUrl && derived.stlUrl.toLowerCase().includes(".stl")) ||
      hasMatch((val) => val.includes("enclosure") && val.endsWith(".stl")) ||
      hasMatch((val) => val.endsWith(".stl"));

    if (!stlPresent) missing.push("stl missing");
  }

  if (includeOptional) {
    if (!derived?.textureUrl) missing.push("texture missing");
    if (!derived?.heightmapUrl) missing.push("heightmap missing");
  }

  return missing;
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
    target: "tile",
    emboss_mode: "lid",
  });

  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [manifestUrl, setManifestUrl] = useState("");
  const [outputs, setOutputs] = useState({
    list: [],
    heroUrl: null,
    stlUrl: null,
    productStlUrl: null,
    textureUrl: null,
    heightmapUrl: null,
    caseBaseUrl: null,
    caseLidUrl: null,
    casePanelUrl: null,
  });
  const [lastCreatePayload, setLastCreatePayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [artifactWarning, setArtifactWarning] = useState("");
  const [missingRequiredOutputs, setMissingRequiredOutputs] = useState([]);
  const [outputsCheckedAt, setOutputsCheckedAt] = useState(null);
  const [timeoutHit, setTimeoutHit] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [previewBust, setPreviewBust] = useState(Date.now());
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteSaving, setPromoteSaving] = useState(false);
  const [promoteError, setPromoteError] = useState("");
  const [promoteForm, setPromoteForm] = useState({
    title: "",
    price: 129,
    category: "surface",
    description: "",
    tags: "",
    sku: "",
    freeze_assets: true,
  });

  const [heightmapJobs, setHeightmapJobs] = useState([]);
  const [heightmapLoading, setHeightmapLoading] = useState(false);
  const [heightmapError, setHeightmapError] = useState("");
  const [selectedHeightmapId, setSelectedHeightmapId] = useState("");

  const [latestSurfaces, setLatestSurfaces] = useState([]);
  const [latestLoading, setLatestLoading] = useState(false);
  const [latestError, setLatestError] = useState("");

  const { adminStatus, isAdmin, refreshAdmin } = useAdmin();
  const adminChecking = adminStatus === "checking" || adminStatus === "unknown";
  const adminKnown = adminStatus === "admin" || adminStatus === "not_admin";
  const debugPromote = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugPromote") === "1",
    []
  );

  const effectiveJobId = useMemo(() => {
    return (
      manifest?.job_id ||
      manifest?.id ||
      jobStatus?.job_id ||
      jobStatus?.jobId ||
      jobStatus?.id ||
      jobStatus?.job?.id ||
      jobId ||
      ""
    );
  }, [manifest, jobStatus, jobId]);

  const heroUrl = useMemo(() => {
    return outputs.heroUrl ? `${outputs.heroUrl}?t=${previewBust}` : null;
  }, [outputs.heroUrl, previewBust]);

  const stlUrl = useMemo(() => outputs.stlUrl || outputs.productStlUrl, [outputs.stlUrl, outputs.productStlUrl]);
  const caseBaseUrl = useMemo(() => outputs.caseBaseUrl, [outputs.caseBaseUrl]);
  const caseLidUrl = useMemo(() => outputs.caseLidUrl, [outputs.caseLidUrl]);
  const casePanelUrl = useMemo(() => outputs.casePanelUrl, [outputs.casePanelUrl]);
  const textureUrl = useMemo(() => outputs.textureUrl, [outputs.textureUrl]);
  const heightmapUrl = useMemo(() => outputs.heightmapUrl, [outputs.heightmapUrl]);

  const selectedHeightmap = useMemo(
    () => heightmapJobs.find((j) => j.id === selectedHeightmapId) || null,
    [heightmapJobs, selectedHeightmapId]
  );

  const selectedHeightmapPreview = useMemo(() => {
    return selectedHeightmap?.previewUrl || selectedHeightmap?.heightmapUrl || null;
  }, [selectedHeightmap]);

  const target = useMemo(() => manifest?.target || manifest?.meta?.target || form.target, [manifest, form.target]);
  const embossMode = useMemo(
    () => manifest?.emboss_mode || manifest?.meta?.emboss_mode || form.emboss_mode,
    [manifest, form.emboss_mode]
  );

  const statusLabel = normalizeState(jobStatus?.state || jobStatus?.status || "idle");
  const progress = deriveProgress(statusLabel, jobStatus?.progress);

  const isComplete = statusLabel === "complete";
  const isFailed = statusLabel === "failed";
  const missingOutputs = (isComplete || isFailed) && missingRequiredOutputs.length > 0;

  const derivedSubfolder = useMemo(
    () => deriveSubfolderFromUrl(manifest, manifestUrl, effectiveJobId),
    [manifest, manifestUrl, effectiveJobId]
  );

  const promoteState = useMemo(() => {
    if (!adminKnown || !isAdmin) return { ready: false, reason: "Admin only", assetsRoot: "" };

    const missing = [];
    if (!effectiveJobId) missing.push("Select a job first");
    if (!isComplete) missing.push("Job not complete");
    if (!manifest) missing.push("Manifest not loaded");

    const assetsRoot = manifest?.assetsRoot || manifest?.public_root || manifest?.public?.public_root || "";
    if (manifest && !assetsRoot) missing.push("assetsRoot missing: add public_root or subfolder");

    const reason = missing[0] || "";
    return {
      ready: missing.length === 0,
      reason,
      assetsRoot,
    };
  }, [adminKnown, isAdmin, isComplete, manifest, effectiveJobId]);

  useEffect(() => {
    if (!jobId || !polling) return undefined;

    let cancelled = false;
    let timer = null;

    const pollOnce = async () => {
      if (cancelled) return;

      const tooLong = typeof startedAt === "number" && Date.now() - startedAt > 5 * 60 * 1000;
      if (tooLong) {
        setTimeoutHit(true);
        setPolling(false);
        return;
      }

      try {
        const statusResp = await getSurfaceJobStatus(jobId);
        if (cancelled) return;

        const state = normalizeState(statusResp.state || statusResp.status);
        const next = { ...statusResp, state, status: state, progress: deriveProgress(state, statusResp.progress) };
        setJobStatus(next);

        const manifestFromStatus = next.manifest || next.result?.manifest;
        const manifestUrlHint =
          next.manifest_url ||
          manifestFromStatus?.manifest_url ||
          manifestFromStatus?.public?.job_manifest ||
          manifestUrl ||
          "";

        if (manifestUrlHint) {
          const resolvedHint = resolveSurfaceUrl(manifestUrlHint);
          setManifestUrl((prev) => {
            if (!prev) return resolvedHint;
            return prev !== resolvedHint ? resolvedHint : prev;
          });
        }

        if (!manifest && (manifestFromStatus || manifestUrlHint)) {
          await fetchAndApplyManifest(manifestUrlHint, manifestFromStatus || null, state, { allowMissing: state !== "complete" });
        }

        if (state === "complete") {
          setPolling(false);
          if (!manifest) {
            await fetchAndApplyManifest(manifestUrlHint, manifestFromStatus || null, state, { allowMissing: false });
          }
          return;
        }

        if (state === "failed") {
          setPolling(false);
          setError(statusResp?.error || statusResp?.message || "Surface job failed.");
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setJobStatus({ state: "failed", status: "failed", progress: 0, job_id: jobId });
        setError(err?.message || "Surface status check failed.");
        setPolling(false);
        return;
      }

      timer = setTimeout(pollOnce, 2000);
    };

    pollOnce();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, polling, startedAt, manifest, manifestUrl]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HEIGHTMAP_STORAGE_KEY) || "";
      if (stored) setSelectedHeightmapId(stored);
    } catch (e) {
      console.warn("surface: localStorage unavailable", e);
    }
  }, []);

  useEffect(() => {
    if (adminStatus === "unknown") {
      refreshAdmin();
    }
  }, [adminStatus, refreshAdmin]);

  useEffect(() => {
    if (!DEBUG_MODE || !heroUrl) return undefined;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let sum = 0;
        let sumSq = 0;
        const pixels = data.length / 4;
        for (let i = 0; i < pixels; i += 1) {
          const idx = i * 4;
          const v = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          sum += v;
          sumSq += v * v;
        }
        const mean = sum / pixels;
        const variance = sumSq / pixels - mean * mean;
        if (variance < 5) {
          setArtifactWarning((prev) => prev || "Preview appears blank (low variance)");
        }
      } catch (err) {
        // Ignore canvas errors in prod
        if (DEBUG_MODE) console.warn("preview variance check failed", err);
      }
    };

    img.onerror = () => {
      if (cancelled) return;
      setArtifactWarning((prev) => prev || "Preview failed to load");
    };

    img.src = heroUrl;

    return () => {
      cancelled = true;
    };
  }, [heroUrl]);

  useEffect(() => {
    if (!effectiveJobId) return;
    const promo = manifest?.promotion || {};
    setPromoteForm((prev) => ({
      ...prev,
      title: prev.title || promo.title || manifest?.meta?.name || manifest?.job_name || form.name || effectiveJobId,
      description: prev.description || promo.description || manifest?.meta?.description || manifest?.description || "",
      category: prev.category || promo.categories?.[0] || "surface",
      price: prev.price || promo.price || prev.price,
      tags: prev.tags || (Array.isArray(promo.categories) ? promo.categories.join(", ") : promo.categories || prev.tags),
      sku: prev.sku || promo.sku_seed || promo.sku || prev.sku,
    }));
  }, [manifest, effectiveJobId, form.name]);

  useEffect(() => {
    refreshHeightmapJobs();
    refreshLatestSurfaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshHeightmapJobs() {
    setHeightmapLoading(true);
    setHeightmapError("");
    try {
      const data = await getHeightmapLatest(25);
      const items = Array.isArray(data?.items) ? data.items : [];

      const mapped = items.map((job) => {
        const heightmapUrl = resolveHeightmapUrl(job.heightmap_url || job.heightmapUrl);
        const previewUrl = resolveHeightmapUrl(
          job.preview_url || job.previewUrl || job.heightmap_url || job.heightmapUrl || ""
        );

        return {
          id: job.job_id || job.id,
          name: job.job_name || job.name || job.jobId || job.job_id || job.id,
          status: job.status || "complete",
          created_at: job.created_at,
          updated_at: job.updated_at,
          heightmapUrl,
          previewUrl,
          manifestUrl: job.manifest_url || job.manifestUrl || null,
          subfolder: job.subfolder || "",
        };
      });

      if (mapped.length === 0) {
        setHeightmapJobs([]);
        setSelectedHeightmapId("");
        setHeightmapError("No completed heightmaps found");
        return;
      }

      const valid = mapped.filter((j) => !!j.heightmapUrl);

      if (valid.length === 0) {
        setHeightmapJobs(mapped);
        setSelectedHeightmapId("");
        setHeightmapError("No heightmap artifact found for the latest jobs");
        return;
      }

      const preferredId = (() => {
        if (selectedHeightmapId && mapped.some((j) => j.id === selectedHeightmapId)) {
          return selectedHeightmapId;
        }
        try {
          const stored = window.localStorage.getItem(HEIGHTMAP_STORAGE_KEY);
          if (stored && mapped.some((j) => j.id === stored)) return stored;
        } catch {
          /* ignore */
        }
        return valid[0]?.id || "";
      })();

      setHeightmapJobs(mapped);
      setSelectedHeightmapId(preferredId);
      try {
        window.localStorage.setItem(HEIGHTMAP_STORAGE_KEY, preferredId);
      } catch {
        /* ignore */
      }
    } catch (err) {
      const endpointMissing = err?.endpointNotFound || err?.status === 404;
      setHeightmapError(endpointMissing ? "Endpoint not found" : err?.message || "Failed to load heightmap jobs.");
      setHeightmapJobs([]);
      setSelectedHeightmapId("");
    } finally {
      setHeightmapLoading(false);
    }
  }

  async function refreshLatestSurfaces(limit = 10) {
    setLatestLoading(true);
    setLatestError("");
    try {
      const data = await getSurfaceLatest(limit);
      const items = Array.isArray(data?.items) ? data.items : [];
      setLatestSurfaces(items);
    } catch (err) {
      setLatestError(err?.message || "Failed to load latest surface jobs.");
      setLatestSurfaces([]);
    } finally {
      setLatestLoading(false);
    }
  }

  async function startJob() {
    setError("");
    setArtifactWarning("");
    setOutputsCheckedAt(null);
    setManifest(null);
    setManifestUrl("");
    setOutputs({
      list: [],
      heroUrl: null,
      stlUrl: null,
      productStlUrl: null,
      textureUrl: null,
      heightmapUrl: null,
      caseBaseUrl: null,
      caseLidUrl: null,
      casePanelUrl: null,
    });
    setJobId("");
    setTimeoutHit(false);
    setJobStatus(null);
    setPolling(false);
    setStartedAt(null);
    setPreviewBust(Date.now());
    setLastCreatePayload(null);

    if (!selectedHeightmap || !selectedHeightmap.heightmapUrl) {
      setError("Select a completed heightmap first.");
      return;
    }

    const selectedHeightmapUrl = resolveHeightmapUrl(selectedHeightmap.heightmapUrl);

    const payload = {
      name: form.name || defaultJobName(),
      quality: form.quality,
      notes: form.notes || "",
      mode: "relief",
      source_heightmap_url: selectedHeightmapUrl,
      source_heightmap_job_id: selectedHeightmap.id,
      target: form.target,
      emboss_mode: form.target === "pi4b_case" ? form.emboss_mode : undefined,
    };

    setLoading(true);
    try {
      setLastCreatePayload(payload);
      const data = await createSurfaceJob(payload);
      setJobId(data.job_id);
      setJobStatus({ status: "queued", state: "queued", progress: deriveProgress("queued"), job_id: data.job_id });
      setStartedAt(Date.now());
      setPolling(true);
    } catch (err) {
      setError(err?.message || "Surface request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function validateAsset(url) {
    if (!url) return { ok: false, reason: "missing" };
    try {
      const resp = await fetch(url, { method: "HEAD" });
      if (!resp.ok) return { ok: false, reason: String(resp.status) };
      const len = Number(resp.headers.get("content-length") || 0);
      if (Number.isFinite(len) && len <= 0) {
        return { ok: false, reason: "empty" };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err?.message || "unreachable" };
    }
  }

  async function fetchAndApplyManifest(
    manifestHint,
    manifestDataOverride = null,
    stateHint = statusLabel,
    { allowMissing = false } = {}
  ) {
    const manifestUrlResolved = manifestHint ? resolveSurfaceUrl(manifestHint) : "";
    let mf = manifestDataOverride || null;
    let lastError = null;

    if (!mf) {
      try {
        mf = await getSurfaceManifest(jobId);
      } catch (err) {
        lastError = err;
        if (manifestUrlResolved) {
          try {
            const res = await fetch(manifestUrlResolved);
            if (res.ok) {
              mf = await res.json();
            } else {
              lastError = new Error(`Manifest fetch failed (${res.status})`);
            }
          } catch (e) {
            lastError = e;
          }
        }
      }
    }

    if (!mf) {
      if (allowMissing) return null;
      throw lastError || new Error("Manifest missing after job completion.");
    }

    const resolvedManifestUrl =
      manifestUrlResolved ||
      resolveSurfaceUrl(mf.manifest_url || mf.meta?.manifest_url || mf.public?.job_manifest || manifestUrl || "");

    const derived = deriveOutputs(mf, jobId, manifestUrlResolved || manifestHint || "");
    const targetForChecks = mf?.target || mf?.meta?.target || form.target;
    const assetsRoot = computeAssetsRoot(mf);
    setManifestUrl(resolvedManifestUrl || "");
    setManifest({ ...mf, assetsRoot });
    setOutputs(derived);
    setPreviewBust(Date.now());
    setOutputsCheckedAt(Date.now());

    if (DEBUG_MODE) {
      // eslint-disable-next-line no-console
      console.warn("surface: preview resolution", {
        job_id: jobId,
        manifest_public_root: mf?.public_root || mf?.public?.public_root,
        manifest_subfolder: mf?.subfolder,
        manifest_public_previews: mf?.public?.previews || mf?.public?.blender_previews_urls,
        computed_hero_url: derived.heroUrl,
        outputs_sample: derived.list?.slice(0, 3),
      });
    }

    const requiredWarnings = stateHint === "complete" ? summarizeMissingOutputs(derived, targetForChecks, { includeOptional: false }) : [];
    const optionalWarnings = summarizeMissingOutputs(derived, targetForChecks, { includeOptional: true }).filter(
      (item) => !requiredWarnings.includes(item)
    );

    const normalizedTarget = String(targetForChecks || "").toLowerCase();

    if (stateHint === "complete") {
      const validationTargets = [];
      if (derived.heroUrl) validationTargets.push({ label: "preview", url: derived.heroUrl });

      if (normalizedTarget === "board_case" || normalizedTarget.endsWith("_case")) {
        if (derived.caseBaseUrl) validationTargets.push({ label: "case base", url: derived.caseBaseUrl });
        if (derived.caseLidUrl) validationTargets.push({ label: "case lid", url: derived.caseLidUrl });
      } else if (derived.stlUrl) {
        validationTargets.push({ label: "stl", url: derived.stlUrl });
      }

      const checks = await Promise.all(
        validationTargets.map((item) =>
          validateAsset(item.url)
            .then((res) => ({ item, res }))
            .catch((err) => ({ item, res: { ok: false, reason: err?.message || "error" } }))
        )
      );

      checks.forEach(({ item, res }) => {
        if (!res.ok) {
          const label = `${item.label} ${res.reason}`.trim();
          if (!requiredWarnings.includes(label)) requiredWarnings.push(label);
        }
      });
    }

    const warningText = [...requiredWarnings, ...optionalWarnings].join("; ");
    setArtifactWarning(warningText);
    setMissingRequiredOutputs(requiredWarnings);

    if (stateHint === "complete") {
      if (requiredWarnings.length > 0) {
        setJobStatus((prev) => ({ ...(prev || {}), state: "failed", status: "failed", progress: deriveProgress("failed") }));
        setError(warningText || "Manifest outputs are missing or invalid.");
      } else {
        setJobStatus((prev) => ({ ...(prev || {}), state: "complete", status: "complete", progress: deriveProgress("complete", prev?.progress) }));
        setError(optionalWarnings.length ? optionalWarnings.join("; ") : "");
      }
    } else if (requiredWarnings.length === 0) {
      setError(optionalWarnings.length ? optionalWarnings.join("; ") : "");
    }

    return mf;
  }

  async function recheckOutputs() {
    try {
      await fetchAndApplyManifest(manifestUrl, null, "complete", { allowMissing: false });
      setError("");
    } catch (err) {
      setError(err?.message || "Re-check failed");
    }
  }

  async function handlePromoteSubmit(event) {
    event.preventDefault();
    setPromoteSaving(true);
    setPromoteError("");

    try {
      const assetsRoot = manifest?.assetsRoot || manifest?.public_root || manifest?.public?.public_root || "";
      if (!manifest || !assetsRoot) {
        throw new Error("Surface assets are not ready");
      }

      const payload = {
        job_id: effectiveJobId || jobId,
        subfolder: derivedSubfolder || null,
        title: promoteForm.title || form.name || effectiveJobId || jobId,
        price: Number(promoteForm.price) || 0,
        category: promoteForm.category || "surface",
        description: promoteForm.description || null,
        tags: promoteForm.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        sku: promoteForm.sku || null,
        freeze_assets: !!promoteForm.freeze_assets,
      };

      const res = await fetch("/api/products/from-surface-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Promotion failed");
      }

      toast.success("Product drafted from surface job");
      setPromoteOpen(false);
    } catch (err) {
      const message = err?.message || "Promotion failed";
      setPromoteError(message);
      toast.error(message);
    } finally {
      setPromoteSaving(false);
    }
  }

  const metadata = useMemo(() => {
    if (!manifest) return [];
    const meta = manifest.meta || manifest.metadata || {};
    return [
      { label: "Job", value: manifest.job_id || effectiveJobId || "" },
      { label: "Created", value: formatTs(meta.created_at || manifest.created_at) },
      { label: "Service", value: meta.service_version || manifest.service_version || "n/a" },
      { label: "Assets", value: SURFACE_ASSET_BASE },
      { label: "Manifest", value: manifestUrl || "" },
      { label: "Heightmap", value: selectedHeightmap?.name || "none" },
    ];
  }, [manifest, effectiveJobId, selectedHeightmap, manifestUrl]);

  function resetJob() {
    setJobId("");
    setJobStatus(null);
    setManifest(null);
    setManifestUrl("");
    setOutputs({
      list: [],
      heroUrl: null,
      stlUrl: null,
      productStlUrl: null,
      textureUrl: null,
      heightmapUrl: null,
      caseBaseUrl: null,
      caseLidUrl: null,
      casePanelUrl: null,
    });
    setPolling(false);
    setTimeoutHit(false);
    setError("");
    setStartedAt(null);
    setMissingRequiredOutputs([]);
    setPreviewBust(Date.now());
    setLastCreatePayload(null);
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
                      <option key={job.id} value={job.id} disabled={!job.heightmapUrl}>
                        {job.name} - {formatTs(job.updated_at || job.created_at)}
                        {!job.heightmapUrl ? " (no heightmap artifact)" : ""}
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
              <span>Product target</span>
              <select
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
              >
                <option value="tile">Relief Tile</option>
                <option value="pi4b_case">Raspberry Pi 4B Case</option>
              </select>
            </label>

            {form.target === "pi4b_case" && (
              <label className="surface-label">
                <span>Emboss mode</span>
                <div className="surface-segmented">
                  {["lid", "panel", "both"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`surface-segment ${form.emboss_mode === mode ? "is-active" : ""}`}
                      onClick={() => setForm({ ...form, emboss_mode: mode })}
                    >
                      {mode === "lid" ? "Lid" : mode === "panel" ? "Panel" : "Both"}
                    </button>
                  ))}
                </div>
              </label>
            )}

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
            {effectiveJobId && (
              <span className="surface-chip surface-chip-ghost">{effectiveJobId}</span>
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
              <img
                src={heroUrl}
                alt="Surface hero preview"
                onError={() => setArtifactWarning((prev) => prev || "Preview image missing")}
              />
            </div>
          ) : (
            <div className="surface-placeholder">
              <ImageIcon size={22} />
              <p>Preview will appear once the job finishes.</p>
              {missingOutputs && <p className="surface-inline-error">Manifest missing preview output.</p>}
            </div>
          )}

          {artifactWarning && (
            <div className="surface-alert surface-alert-warn" style={{ marginTop: "0.75rem" }}>
              <AlertTriangle size={18} />
              <div>
                <p className="surface-alert-title">Artifact warning</p>
                <p className="surface-alert-body">{artifactWarning}</p>
              </div>
              <button className="surface-link" type="button" onClick={recheckOutputs}>
                Re-check outputs
              </button>
            </div>
          )}
        </section>

        <section className="surface-card">
          <div className="surface-card-head">
            <div>
              <p className="surface-eyebrow">Outputs</p>
              <h2>Downloads</h2>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {adminChecking && (
                <span className="surface-chip surface-chip-ghost">Checking admin…</span>
              )}
              {isComplete && <span className="surface-chip surface-chip-success">Complete</span>}
              {isComplete && (
                <button type="button" className="surface-button surface-button-ghost" onClick={recheckOutputs}>
                  <RefreshCw size={14} /> Re-check outputs
                </button>
              )}
            </div>
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
            {target === "pi4b_case" ? (
              <>
                <button
                  className="surface-download"
                  type="button"
                  onClick={() => caseBaseUrl && window.open(caseBaseUrl, "_blank")}
                  disabled={!caseBaseUrl}
                >
                  <FileDown size={18} />
                  <div>
                    <p>Pi4B Base STL</p>
                    <span>{caseBaseUrl ? "Download" : missingOutputs ? "Missing from manifest" : "Unavailable"}</span>
                  </div>
                  <Download size={16} />
                </button>

                <button
                  className="surface-download"
                  type="button"
                  onClick={() => caseLidUrl && window.open(caseLidUrl, "_blank")}
                  disabled={!caseLidUrl}
                >
                  <FileDown size={18} />
                  <div>
                    <p>Pi4B Lid STL</p>
                    <span>{caseLidUrl ? "Download" : missingOutputs ? "Missing from manifest" : "Unavailable"}</span>
                  </div>
                  <Download size={16} />
                </button>

                {(embossMode === "panel" || embossMode === "both") && (
                  <button
                    className="surface-download"
                    type="button"
                    onClick={() => casePanelUrl && window.open(casePanelUrl, "_blank")}
                    disabled={!casePanelUrl}
                  >
                    <FileDown size={18} />
                    <div>
                      <p>Pi4B Panel STL</p>
                      <span>{casePanelUrl ? "Download" : missingOutputs ? "Missing from manifest" : "Unavailable"}</span>
                    </div>
                    <Download size={16} />
                  </button>
                )}
              </>
            ) : (
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
            )}

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
              <p className="surface-eyebrow">Latest outputs</p>
              <h2>Recent surface jobs</h2>
            </div>
            <button
              type="button"
              className="surface-button surface-button-ghost"
              onClick={() => refreshLatestSurfaces()}
              disabled={latestLoading}
            >
              {latestLoading ? (
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

          {latestError && (
            <div className="surface-alert surface-alert-error" style={{ marginBottom: "0.75rem" }}>
              <AlertTriangle size={18} />
              <div>
                <p className="surface-alert-title">Latest outputs unavailable</p>
                <p className="surface-alert-body">{latestError}</p>
              </div>
            </div>
          )}

          {latestLoading && <p className="surface-muted">Loading recent surface jobs…</p>}

          {!latestLoading && latestSurfaces.length === 0 && !latestError && (
            <div className="surface-placeholder">
              <ImageIcon size={20} />
              <p>No recent surface jobs found.</p>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {latestSurfaces.map((item) => {
              const badge = item.subfolder ? `${item.subfolder}/${item.job_id}` : item.job_id || item.job_name || "job";
              const manifestUrl = item.manifest_url ? resolveSurfaceUrl(item.manifest_url) : item.public_root ? resolveSurfaceUrl(`${item.public_root}/job_manifest.json`) : null;
              const heroSrc = item.hero_url ? resolveSurfaceUrl(item.hero_url) : null;
              const stlSrc = item.stl_url ? resolveSurfaceUrl(item.stl_url) : null;
              const itemKey = `${item.subfolder || "root"}-${item.job_id || item.job_name || manifestUrl || badge}`;

              return (
                <div
                  key={itemKey}
                  style={{
                    border: "1px solid #1f2733",
                    borderRadius: "12px",
                    padding: "0.75rem",
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "stretch",
                    background: "#0c1118",
                  }}
                >
                  <div
                    style={{
                      width: "120px",
                      height: "90px",
                      borderRadius: "8px",
                      background: "#0f141d",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {heroSrc ? (
                      <img
                        src={heroSrc}
                        alt="Latest surface preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={() => setLatestError((prev) => prev || "Preview failed to load")}
                      />
                    ) : (
                      <div className="surface-placeholder" style={{ height: "100%", width: "100%", border: "none" }}>
                        <ImageIcon size={18} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: "1 1 auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                      <p className="surface-k" style={{ margin: 0, fontWeight: 600 }}>
                        {item.job_name || item.job_id || "Surface job"}
                      </p>
                      <span className="surface-chip surface-chip-ghost">{badge}</span>
                    </div>
                    <p className="surface-muted" style={{ margin: 0 }}>Created {formatTs(item.created_at)}</p>
                    {item.target && (
                      <p className="surface-muted" style={{ margin: 0 }}>Target: {item.target}</p>
                    )}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                      <button
                        type="button"
                        className="surface-button surface-button-ghost"
                        onClick={() => manifestUrl && window.open(manifestUrl, "_blank")}
                        disabled={!manifestUrl}
                      >
                        <FileDown size={14} /> Manifest
                      </button>
                      <button
                        type="button"
                        className="surface-button surface-button-ghost"
                        onClick={() => heroSrc && window.open(heroSrc, "_blank")}
                        disabled={!heroSrc}
                      >
                        <ImageIcon size={14} /> Preview
                      </button>
                      <button
                        type="button"
                        className="surface-button surface-button-ghost"
                        onClick={() => stlSrc && window.open(stlSrc, "_blank")}
                        disabled={!stlSrc}
                      >
                        <Download size={14} /> STL
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {isAdmin && (
          <section className="surface-card" style={{ minWidth: "260px" }}>
            <div className="surface-card-head">
              <div>
                <p className="surface-eyebrow">Admin</p>
                <h2>Admin Tools</h2>
              </div>
              <span className="surface-chip surface-chip-ghost">Admin</span>
            </div>

            <p className="surface-muted" style={{ marginTop: "0.25rem" }}>
              Draft a store product from this surface job.
            </p>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="surface-button"
                disabled={!promoteState.ready}
                onClick={() => {
                  setPromoteError("");
                  setPromoteOpen(true);
                  refreshAdmin();
                }}
              >
                Promote to Product
              </button>

              {!promoteState.ready && promoteState.reason && (
                <span className="surface-inline-error">Promote blocked: {promoteState.reason}</span>
              )}
            </div>
          </section>
        )}

        <section className="surface-card">
          <div className="surface-card-head">
            <div>
              <p className="surface-eyebrow">Manifest</p>
              <h2>Metadata</h2>
            </div>
            {manifestUrl && (
              <button
                type="button"
                className="surface-button surface-button-ghost"
                onClick={() => window.open(resolveSurfaceUrl(manifestUrl), "_blank")}
              >
                <FileDown size={14} /> Open Manifest
              </button>
            )}
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
                <div className="surface-meta-row">
                  <span className="surface-k">Payload heightmap_url</span>
                  <span className="surface-v">{lastCreatePayload?.source_heightmap_url || selectedHeightmap?.heightmapUrl || ""}</span>
                </div>
                <div className="surface-meta-row">
                  <span className="surface-k">Payload heightmap_job_id</span>
                  <span className="surface-v">{lastCreatePayload?.source_heightmap_job_id || selectedHeightmap?.id || ""}</span>
                </div>
              </div>

              {lastCreatePayload && (
                <details className="surface-details" open>
                  <summary>Create payload</summary>
                  <pre>{JSON.stringify(lastCreatePayload, null, 2)}</pre>
                </details>
              )}

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

      {promoteOpen && (
        <div
          className="surface-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            className="surface-modal"
            style={{
              background: "#0b0f15",
              border: "1px solid #1f2733",
              borderRadius: "12px",
              padding: "20px",
              width: "min(520px, 92vw)",
              boxShadow: "0 20px 48px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0 }}>Promote to Product</h3>
              <button
                type="button"
                className="surface-button surface-button-ghost"
                onClick={() => setPromoteOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handlePromoteSubmit} className="surface-form" style={{ gap: "12px" }}>
              <label className="surface-label">
                <span>Title</span>
                <input
                  type="text"
                  value={promoteForm.title}
                  onChange={(e) => setPromoteForm({ ...promoteForm, title: e.target.value })}
                  required
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label className="surface-label">
                  <span>Price (USD)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={promoteForm.price}
                    onChange={(e) => setPromoteForm({ ...promoteForm, price: e.target.value })}
                    required
                  />
                </label>
                <label className="surface-label">
                  <span>Category</span>
                  <input
                    type="text"
                    value={promoteForm.category}
                    onChange={(e) => setPromoteForm({ ...promoteForm, category: e.target.value })}
                  />
                </label>
              </div>

              <label className="surface-label">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={promoteForm.description}
                  onChange={(e) => setPromoteForm({ ...promoteForm, description: e.target.value })}
                  placeholder="What makes this relief special?"
                />
              </label>

              <label className="surface-label">
                <span>Tags (comma separated)</span>
                <input
                  type="text"
                  value={promoteForm.tags}
                  onChange={(e) => setPromoteForm({ ...promoteForm, tags: e.target.value })}
                  placeholder="surface, relief, enclosure"
                />
              </label>

              <label className="surface-label">
                <span>SKU (optional)</span>
                <input
                  type="text"
                  value={promoteForm.sku}
                  onChange={(e) => setPromoteForm({ ...promoteForm, sku: e.target.value })}
                  placeholder="SURF-001"
                />
              </label>

              <label className="surface-label" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={!!promoteForm.freeze_assets}
                  onChange={(e) => setPromoteForm({ ...promoteForm, freeze_assets: e.target.checked })}
                />
                <span>Freeze asset URLs (avoid later rewrites)</span>
              </label>

              {promoteError && <p className="surface-inline-error">{promoteError}</p>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="surface-button surface-button-ghost"
                  onClick={() => setPromoteOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="surface-button" disabled={promoteSaving}>
                  {promoteSaving ? 'Promoting…' : 'Create draft product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
