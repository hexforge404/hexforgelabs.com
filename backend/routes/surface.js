const express = require("express");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("crypto");

const router = express.Router();

const SURFACE_ENGINE_BASE = process.env.SURFACE_ENGINE_URL || "http://surface-engine:8092/api/surface";
const BASIC_AUTH = process.env.SURFACE_ENGINE_BASIC_AUTH || "";
const API_KEY = process.env.SURFACE_ENGINE_API_KEY || "";
const SURFACE_API_KEY = process.env.SURFACE_API_KEY || "";
const DEFAULT_SUBFOLDER = process.env.SURFACE_DEFAULT_SUBFOLDER || "";
const SURFACE_OUTPUT_DIR = process.env.SURFACE_OUTPUT_DIR || "/var/www/hexforge3d/surface";
const SURFACE_PUBLIC_PREFIX = process.env.SURFACE_PUBLIC_PREFIX || "/assets/surface";
const SURFACE_DEBUG = (process.env.SURFACE_DEBUG || "").toLowerCase() === "1";

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

router.post("/jobs", limiter, async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };
    if (!payload.subfolder && DEFAULT_SUBFOLDER) {
      payload.subfolder = DEFAULT_SUBFOLDER;
    }

    const upstream = await forward("POST", "/jobs", payload);
    console.info(
      `[surface] POST /jobs -> ${upstream.status} ok=${upstream.ok} rid=${req.requestId} dur=${Date.now() - req._surfaceStart}ms`
    );
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
    const path = withSubfolder(`/jobs/${encodeURIComponent(jobId)}`, subfolder);
    const upstream = await forward("GET", path, null);
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
    const status = (job.status || body.status || "").toLowerCase();

    const expectedManifestPath = [SURFACE_OUTPUT_DIR, subfolder, jobId, "job_manifest.json"].filter(Boolean).join("/");

    const manifestUrl =
      body.manifest_url ||
      job.manifest_url ||
      job.result?.manifest_url ||
      job.result?.public?.job_manifest ||
      job.public?.job_manifest ||
      job.result?.job_manifest ||
      null;

    const manifestPresent = !!manifestUrl || !!job.manifest;

    if (status === "complete" && !manifestPresent) {
      debugLog("missing_manifest", {
        job_id: jobId,
        expected_manifest_path: expectedManifestPath,
        subfolder,
      });
      return sendError(
        res,
        502,
        "Surface job completed but manifest is missing",
        {
          reason: "missing_manifest",
          job_id: jobId,
          manifest_expected_path: expectedManifestPath,
          outputs_root: SURFACE_OUTPUT_DIR,
          public_prefix: SURFACE_PUBLIC_PREFIX,
          missing: ["manifest_url"],
        }
      );
    }

    return res.status(upstream.status).json({ ...body, manifest_url: manifestUrl });
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

module.exports = router;
