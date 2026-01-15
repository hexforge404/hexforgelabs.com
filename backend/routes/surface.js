// backend/routes/surface.js
const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  assertJobManifest,
  assertJobStatusEnvelope,
  buildErrorEnvelope,
  ContractError,
} = require("../utils/contractValidation");

const router = express.Router();

// Prefer SURFACE_ENGINE_URL (newer), fall back to GLYPHENGINE_URL (older)
const ENGINE_BASE_URL =
  process.env.SURFACE_ENGINE_URL ||
  process.env.GLYPHENGINE_URL ||
  "http://glyphengine:8092";

const SERVICE_NAME = process.env.SURFACE_SERVICE_NAME || "glyphengine";

// Optional upstream auth (kept from legacy proxy behavior)
const BASIC_AUTH = process.env.SURFACE_ENGINE_BASIC_AUTH || "";
const API_KEY = process.env.SURFACE_ENGINE_API_KEY || "";

// Basic limiter (same spirit as the older proxy)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function makeHeaders(extra = {}) {
  const headers = {
    Accept: "application/json",
    ...extra,
  };

  // If upstream expects basic auth, we support the legacy env var.
  // NOTE: BASIC_AUTH is treated as "user:pass" (same as previous code).
  if (BASIC_AUTH) {
    headers.Authorization = `Basic ${Buffer.from(BASIC_AUTH).toString("base64")}`;
  }

  if (API_KEY) {
    headers["x-api-key"] = API_KEY;
  }

  return headers;
}

async function proxyJson(path, init = {}) {
  const url = `${ENGINE_BASE_URL}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  const resp = await fetch(url, {
    ...init,
    signal: controller.signal,
    headers: makeHeaders(init.headers || {}),
  }).finally(() => clearTimeout(timer));

  const text = await resp.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new ContractError("UPSTREAM_NON_JSON", `Expected JSON from ${url}`);
  }

  return { status: resp.status, data };
}

function handleError(res, err, jobId) {
  if (err instanceof ContractError) {
    console.error("surface contract error", err.code, err.detail);
    return res
      .status(502)
      .json(
        buildErrorEnvelope(
          jobId || err.jobId,
          SERVICE_NAME,
          err.code,
          err.detail
        )
      );
  }

  console.error("surface upstream error", err);
  return res.status(502).json(
    buildErrorEnvelope(
      jobId,
      SERVICE_NAME,
      "UPSTREAM_ERROR",
      err?.message || "Unknown upstream error"
    )
  );
}

router.get("/health", limiter, (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME, upstream: ENGINE_BASE_URL });
});

// POST /api/surface/jobs  -> upstream POST /api/surface/jobs
router.post("/jobs", limiter, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { status, data } = await proxyJson("/api/surface/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // enforce contract (strip extras, require public on complete)
    const validated = assertJobStatusEnvelope(data, {
      requirePublicOnComplete: true,
    });

    return res.status(status).json(validated);
  } catch (err) {
    return handleError(res, err, req.body?.job_id);
  }
});

// GET /api/surface/jobs/:jobId -> upstream GET /api/surface/jobs/:jobId
router.get("/jobs/:jobId", limiter, async (req, res) => {
  const { jobId } = req.params;
  try {
    const { status, data } = await proxyJson(`/api/surface/jobs/${jobId}`);
    const validated = assertJobStatusEnvelope(data, {
      requirePublicOnComplete: true,
    });
    return res.status(status).json(validated);
  } catch (err) {
    return handleError(res, err, jobId);
  }
});

// GET /api/surface/jobs/:jobId/assets -> upstream GET /api/surface/jobs/:jobId/assets
router.get("/jobs/:jobId/assets", limiter, async (req, res) => {
  const { jobId } = req.params;
  try {
    const { status, data } = await proxyJson(
      `/api/surface/jobs/${jobId}/assets`
    );
    const manifest = assertJobManifest(data);
    return res.status(status).json(manifest);
  } catch (err) {
    return handleError(res, err, jobId);
  }
});

// Docs proxy (HTML)
router.get("/docs", limiter, async (req, res) => {
  try {
    const url = `${ENGINE_BASE_URL}/docs`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: makeHeaders({ Accept: "text/html" }),
    }).finally(() => clearTimeout(timer));

    let body = await upstream.text();
    
    // Filter out internal hostname to prevent leaking infrastructure details
    // Extract hostname from ENGINE_BASE_URL (e.g., "http://glyphengine:8092" -> "glyphengine:8092")
    const hostnameMatch = ENGINE_BASE_URL.match(/https?:\/\/([^\/]+)/);
    if (hostnameMatch) {
      const internalHostname = hostnameMatch[1];
      // Escape special regex characters in hostname before using in RegExp
      const escapedHostname = internalHostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      body = body.replace(new RegExp(escapedHostname, 'g'), req.get('host') || 'localhost');
    }
    
    res.status(upstream.status);
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "text/html"
    );
    return res.send(body);
  } catch (err) {
    return handleError(res, err);
  }
});

// OpenAPI JSON proxy
router.get("/openapi.json", limiter, async (req, res) => {
  try {
    const { status, data } = await proxyJson("/openapi.json");
    return res.status(status).json(data);
  } catch (err) {
    return handleError(res, err);
  }
});

module.exports = router;
