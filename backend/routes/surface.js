const express = require("express");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const router = express.Router();

const RAW_SURFACE_ENGINE_BASE =
  process.env.SURFACE_ENGINE_URL ||
  process.env.GLYPHENGINE_URL ||
  "http://surface-engine:8092/api/surface";
const SURFACE_ENGINE_BASE = RAW_SURFACE_ENGINE_BASE.endsWith("/api/surface")
  ? RAW_SURFACE_ENGINE_BASE
  : `${RAW_SURFACE_ENGINE_BASE.replace(/\/$/, "")}/api/surface`;
const BASIC_AUTH = process.env.SURFACE_ENGINE_BASIC_AUTH || "";
const API_KEY = process.env.SURFACE_ENGINE_API_KEY || "";
const SURFACE_API_KEY = process.env.SURFACE_API_KEY || "";
const SMOKE_MODE = (process.env.SURFACE_SMOKE_MODE || "").toLowerCase() === "1";
const DEFAULT_SUBFOLDER = process.env.SURFACE_DEFAULT_SUBFOLDER || (SMOKE_MODE ? "smoke-test" : "");
const SURFACE_OUTPUT_DIR = process.env.SURFACE_OUTPUT_DIR || "/var/www/hexforge3d/surface";
const SURFACE_PUBLIC_PREFIX = process.env.SURFACE_PUBLIC_PREFIX || "/assets/surface";
const SURFACE_DEBUG = (process.env.SURFACE_DEBUG || "").toLowerCase() === "1";
const HEIGHTMAP_INTERNAL_BASE =
  (process.env.HEIGHTMAP_INTERNAL_BASE ||
    process.env.SURFACE_HEIGHTMAP_INTERNAL_BASE ||
    process.env.SURFACE_HEIGHTMAP_BASE ||
  "http://nginx").replace(/\/+$/, "");

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use((req, res, next) => {
  req.requestId = req.headers["x-request-id"] || randomUUID();
  req._surfaceStart = Date.now();

  if (!SURFACE_API_KEY) return next();

  const provided = req.headers["x-api-key"] || req.query.api_key;
  if (provided !== SURFACE_API_KEY) {
    console.warn(
      `[surface] 403 invalid API key rid=${req.requestId} ip=${req.ip}`
    );
    return res.status(403).json({ ok: false, error: "surface API key invalid or missing" });
  }

  return next();
});

function makeHeaders() {
  const headers = { Accept: "application/json" };
  if (BASIC_AUTH) {
    headers.Authorization = `Basic ${Buffer.from(BASIC_AUTH).toString("base64")}`;
  }
  if (API_KEY) {
    headers["x-api-key"] = API_KEY;
  }
  return headers;
}

const STATE_MAP = {
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

function normalizeState(status) {
  const key = String(status || "").toLowerCase();
  return STATE_MAP[key] || key || "unknown";
}

function deriveProgress(state, rawProgress) {
  if (Number.isFinite(rawProgress)) {
    return Math.min(100, Math.max(0, Math.round(rawProgress)));
  }

  const fallback = {
    queued: 10,
    running: 60,
    writing: 85,
    complete: 100,
    failed: 0,
  };

  return fallback[state] ?? 0;
}

async function forward(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const headers = makeHeaders();
  const opts = { method, headers, signal: controller.signal };

  if (body && method !== "GET") {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  try {
    const upstream = await fetch(`${SURFACE_ENGINE_BASE}${path}`, opts);
    const text = await upstream.text();
    clearTimeout(timer);

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return { status: upstream.status, ok: upstream.ok, data: normalizeSurfacePayload(data) };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function normalizeSurfacePayload(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const cloned = Array.isArray(payload) ? payload.map(normalizeSurfacePayload) : { ...payload };

  if (typeof cloned.service === "string") {
    cloned.service = cloned.service.replace(/hexforge-glyphengine/gi, "hexforge-surface-engine");
  }

  // RESERVED FOR PHASE 1 — Board profile JSON and texture-safe zones will be stitched here; do not implement until Raspberry Pi requirements are finalized.

  if (cloned.result && typeof cloned.result === "object") {
    cloned.result = normalizeSurfacePayload(cloned.result);
  }

  return cloned;
}

function withSubfolder(path, subfolder) {
  if (!subfolder) return path;
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}subfolder=${encodeURIComponent(subfolder)}`;
}

function sendError(res, status, message, detail) {
  res.status(status).json({ ok: false, message, detail });
}

function debugLog(...args) {
  if (SURFACE_DEBUG) {
    console.warn("[surface-debug]", ...args);
  }
}

function pickHeightmapUrl(payload = {}) {
  return (
    payload.heightmap_url ||
    payload.source_heightmap_url ||
    payload.heightmapUrl ||
    payload.source_heightmapUrl ||
    null
  );
}

function toAbsoluteHeightmapUrl(url) {
  if (!url) return null;
  const raw = String(url).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const host = (parsed.hostname || "").toLowerCase();
      const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";

      if (isLocalHost) {
        const base = HEIGHTMAP_INTERNAL_BASE.replace(/\/+$/, "");
        return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      return raw;
    } catch {
      // fall through and treat as relative
    }
  }

  const base = HEIGHTMAP_INTERNAL_BASE.replace(/\/+$/, "");
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}${path}`;
}

function buildManifestUrl(subfolder, jobId) {
  const trimmed = [SURFACE_PUBLIC_PREFIX.replace(/\/$/, ""), subfolder, jobId, "job_manifest.json"].filter(Boolean);
  return trimmed.join("/").replace(/\/+/g, "/");
}

async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (err) {
    if (err?.code === "ENOENT") return false;
    throw err;
  }
}

function resolvePublicRoot(subfolder, jobId) {
  const prefix = SURFACE_PUBLIC_PREFIX.replace(/\/$/, "");
  return [prefix, subfolder, jobId].filter(Boolean).join("/").replace(/\/+/g, "/");
}

function resolveAssetUrl(maybeRelative, publicRoot) {
  if (!maybeRelative) return null;
  const raw = String(maybeRelative).trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/assets/surface/")) return raw;

  const cleaned = raw.replace(/^\/+/, "");
  if (cleaned.startsWith("assets/surface/")) return `/${cleaned}`;

  if (publicRoot) return `${publicRoot}/${cleaned}`.replace(/\/+/g, "/");
  return `${SURFACE_PUBLIC_PREFIX.replace(/\/$/, "")}/${cleaned}`.replace(/\/+/g, "/");
}

async function collectJobsFromDir(dirPath, subfolder = "") {
  const jobs = [];
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    if (err?.code === "ENOENT") return jobs;
    throw err;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const jobId = entry.name;
    const jobDir = path.join(dirPath, jobId);
    const manifestPath = path.join(jobDir, "job_manifest.json");
    const manifestExists = await fileExists(manifestPath);

    // If this directory has no manifest but has children, treat it as a nested subfolder.
    if (!manifestExists) {
      const nestedEntries = await fs.readdir(jobDir, { withFileTypes: true });
      const hasChildJobs = nestedEntries.some((child) => child.isDirectory());
      if (hasChildJobs) {
        const nestedJobs = await collectJobsFromDir(jobDir, subfolder ? `${subfolder}/${jobId}` : jobId);
        jobs.push(...nestedJobs);
        continue;
      }
    }

    let manifest = null;
    if (manifestExists) {
      try {
        const raw = await fs.readFile(manifestPath, "utf8");
        manifest = JSON.parse(raw);
      } catch (err) {
        debugLog("manifest_parse_error", { job_id: jobId, err });
      }
    }

    const stats = await fs.stat(jobDir);
    const publicRoot = resolvePublicRoot(subfolder, jobId);
    const manifestUrl = `${publicRoot}/job_manifest.json`;

    const outputsArray = Array.isArray(manifest?.outputs)
      ? manifest.outputs
      : manifest?.outputs && typeof manifest.outputs === "object"
        ? Object.entries(manifest.outputs).map(([type, val]) => ({ type, ...(val && typeof val === "object" ? val : { url: val }) }))
        : [];

    const pickOutputUrl = (predicate) => {
      const found = outputsArray.find(predicate);
      if (!found) return null;
      return resolveAssetUrl(found.url || found.path || found.public_url, publicRoot);
    };

    const heroUrl = resolveAssetUrl(
      manifest?.public?.previews?.hero ||
        manifest?.public?.hero ||
        pickOutputUrl((o) => (o.type || "").toLowerCase().includes("hero")),
      publicRoot
    );

    const stlUrl = pickOutputUrl((o) => {
      const type = (o.type || "").toLowerCase();
      const name = (o.name || o.label || o.url || "").toLowerCase();
      return type.includes("stl") || name.endsWith(".stl");
    });

    jobs.push({
      job_id: jobId,
      job_name: manifest?.job_name || manifest?.name || manifest?.meta?.name || jobId,
      subfolder: subfolder || "",
      manifest_url: manifestUrl,
      public_root: publicRoot,
      hero_url: heroUrl,
      stl_url: stlUrl,
      target: manifest?.target || manifest?.meta?.target || null,
      state: manifest?.state || manifest?.status || null,
      created_at: stats.mtimeMs || stats.ctimeMs || Date.now(),
    });
  }

  return jobs;
}

router.post("/jobs", limiter, async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };
    let effectiveSubfolder = payload.subfolder || "";
    if (!effectiveSubfolder && DEFAULT_SUBFOLDER) {
      payload.subfolder = DEFAULT_SUBFOLDER;
      effectiveSubfolder = DEFAULT_SUBFOLDER;
    }

    const heightmapUrl = pickHeightmapUrl(payload);
    const absoluteHeightmapUrl = toAbsoluteHeightmapUrl(heightmapUrl);

    if (absoluteHeightmapUrl) {
      payload.heightmap_url = absoluteHeightmapUrl;
      payload.source_heightmap_url = absoluteHeightmapUrl;
    }
    if (!payload.heightmap_job_id && payload.source_heightmap_job_id) {
      payload.heightmap_job_id = payload.source_heightmap_job_id;
    }

    debugLog("create_job_payload", {
      job_name: payload.name || null,
      subfolder: payload.subfolder || null,
      heightmap_url: absoluteHeightmapUrl || heightmapUrl || null,
      heightmap_job_id: payload.source_heightmap_job_id || payload.heightmap_job_id || null,
      request_id: req.requestId,
    });

    const upstream = await forward("POST", "/jobs", payload);
    console.info(
      `[surface] POST /jobs -> ${upstream.status} ok=${upstream.ok} rid=${req.requestId} dur=${Date.now() - req._surfaceStart}ms`
    );
    debugLog("create_job_response", {
      job_id: upstream.data?.job_id || null,
      subfolder: payload.subfolder || null,
      heightmap_url: heightmapUrl || null,
      status: upstream.status,
    });
    if (!upstream.ok) {
      return sendError(
        res,
        upstream.status,
        upstream.data?.message || upstream.data?.error || "Surface create failed",
        upstream.data || null
      );
    }
    return res.status(upstream.status).json(upstream.data);
  } catch (err) {
    console.error(
      `surface proxy create error rid=${req.requestId} dur=${Date.now() - req._surfaceStart}ms`,
      err
    );
    return sendError(res, 502, "Surface proxy unreachable", err?.message || err);
  }
});

router.get("/health", limiter, async (req, res) => {
  try {
    const upstream = await forward("GET", "/health", null);
    console.info(
      `[surface] GET /health -> ${upstream.status} ok=${upstream.ok} rid=${req.requestId} dur=${Date.now() - req._surfaceStart}ms`
    );
    return res.status(upstream.status).json(upstream.data || { ok: upstream.ok });
  } catch (err) {
    console.error(
      `surface proxy health error rid=${req.requestId} dur=${Date.now() - req._surfaceStart}ms`,
      err
    );
    return sendError(res, 502, "Surface proxy unreachable", err?.message || err);
  }
});

router.get("/jobs/:jobId", limiter, async (req, res) => {
  const { jobId } = req.params;
  const subfolder = req.query.subfolder || DEFAULT_SUBFOLDER || null;
  try {
    const upstreamPath = withSubfolder(`/jobs/${encodeURIComponent(jobId)}`, subfolder);
    const upstream = await forward("GET", upstreamPath, null);
    console.info(
      `[surface] GET /jobs/${jobId} -> ${upstream.status} ok=${upstream.ok} rid=${req.requestId} dur=${Date.now() - req._surfaceStart}ms`
    );
    if (!upstream.ok) {
      return sendError(
        res,
        upstream.status,
        upstream.data?.message || upstream.data?.error || "Surface status failed",
        upstream.data || null
      );
    }
    const body = upstream.data || {};
    const job = body.job || body.result || body;
    const status = job.status || body.status || job.state || body.state || "";
    const state = normalizeState(status);
    const progress = deriveProgress(state, job.progress ?? body.progress);

    const manifestFsPath = path.join(SURFACE_OUTPUT_DIR, subfolder || "", jobId, "job_manifest.json");
    const manifestFromUpstream =
      body.manifest ||
      job.manifest ||
      job.result?.manifest ||
      body.result?.manifest ||
      null;

    const manifestUrlFromUpstream =
      body.manifest_url ||
      job.manifest_url ||
      job.result?.manifest_url ||
      job.result?.public?.job_manifest ||
      job.public?.job_manifest ||
      job.result?.job_manifest ||
      job.job_manifest ||
      body.result?.job_manifest ||
      manifestFromUpstream?.manifest_url ||
      manifestFromUpstream?.public?.job_manifest ||
      null;

    const inferredManifestUrl = buildManifestUrl(subfolder, jobId);

    let manifestUrl = manifestUrlFromUpstream || inferredManifestUrl;
    let manifestExists = false;
    let manifestPayload = manifestFromUpstream || null;

    if (!manifestPayload && state === "complete") {
      manifestExists = await fileExists(manifestFsPath);
      if (manifestExists) {
        try {
          const raw = await fs.readFile(manifestFsPath, "utf8");
          manifestPayload = JSON.parse(raw);
        } catch (err) {
          debugLog("manifest_read_error", { job_id: jobId, err });
        }
      }
    }

    const manifestAvailable = !!manifestPayload || manifestExists || !!manifestUrlFromUpstream;

    if (state === "complete" && !manifestAvailable) {
      debugLog("missing_manifest", {
        job_id: jobId,
        expected_manifest_path: manifestFsPath,
        subfolder,
      });
      return sendError(
        res,
        502,
        "Surface job completed but manifest is missing",
        {
          reason: "missing_manifest",
          job_id: jobId,
          manifest_expected_path: manifestFsPath,
          manifest_url: manifestUrl,
          outputs_root: SURFACE_OUTPUT_DIR,
          public_prefix: SURFACE_PUBLIC_PREFIX,
          missing: ["manifest", "manifest_url"],
          state: "failed",
        }
      );
    }

    const responseBody = {
      ...body,
      job_id: job.job_id || jobId,
      state,
      status: state,
      progress,
      manifest_url: manifestUrl,
      outputs: manifestPayload?.outputs || body.outputs || job.outputs,
    };

    debugLog("status_response", {
      job_id: responseBody.job_id,
      subfolder,
      manifest_url: manifestUrl,
      outputs_root: SURFACE_OUTPUT_DIR,
      request_id: req.requestId,
    });

    if (manifestPayload) {
      responseBody.manifest = manifestPayload;
    }

    return res.status(upstream.status).json(responseBody);
  } catch (err) {
    console.error(
      `surface proxy status error rid=${req.requestId} dur=${Date.now() - req._surfaceStart}ms`,
      err
    );
    return sendError(res, 502, "Surface proxy unreachable", err?.message || err);
  }
});

router.get("/jobs/:jobId/manifest", limiter, async (req, res) => {
  const { jobId } = req.params;
  const subfolder = req.query.subfolder || DEFAULT_SUBFOLDER || null;
  try {
    const path = withSubfolder(`/jobs/${encodeURIComponent(jobId)}/manifest`, subfolder);
    const upstream = await forward("GET", path, null);
    console.info(
      `[surface] GET /jobs/${jobId}/manifest -> ${upstream.status} ok=${upstream.ok} rid=${req.requestId} dur=${Date.now() - req._surfaceStart}ms`
    );
    if (!upstream.ok) {
      return sendError(
        res,
        upstream.status,
        upstream.data?.message || upstream.data?.error || "Surface manifest failed",
        upstream.data || null
      );
    }
    return res.status(upstream.status).json(upstream.data);
  } catch (err) {
    console.error(
      `surface proxy manifest error rid=${req.requestId} dur=${Date.now() - req._surfaceStart}ms`,
      err
    );
    return sendError(res, 502, "Surface proxy unreachable", err?.message || err);
  }
});

router.get("/latest", limiter, async (req, res) => {
  try {
    const n = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 50) : 10;

    const jobs = await collectJobsFromDir(SURFACE_OUTPUT_DIR, "");
    const sorted = jobs.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).slice(0, limit);

    return res.json({ ok: true, count: sorted.length, items: sorted });
  } catch (err) {
    console.error("surface latest error", err);
    return sendError(res, 500, "Unable to list surface jobs", err?.message || err);
  }
});

module.exports = router;
