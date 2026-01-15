const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const GLYPH_BASE = process.env.SURFACE_ENGINE_URL || "http://glyphengine:8092/api/surface";
const BASIC_AUTH = process.env.SURFACE_ENGINE_BASIC_AUTH || "";
const API_KEY = process.env.SURFACE_ENGINE_API_KEY || "";

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
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
    const upstream = await fetch(`${GLYPH_BASE}${path}`, opts);
    const text = await upstream.text();
    clearTimeout(timer);

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return { status: upstream.status, ok: upstream.ok, data };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function sendError(res, status, message, detail) {
  res.status(status).json({ ok: false, message, detail });
}

router.post("/jobs", limiter, async (req, res) => {
  try {
    const upstream = await forward("POST", "/jobs", req.body || {});
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
    console.error("surface proxy create error", err);
    return sendError(res, 502, "Surface proxy unreachable", err?.message || err);
  }
});

router.get("/jobs/:jobId", limiter, async (req, res) => {
  const { jobId } = req.params;
  try {
    const upstream = await forward("GET", `/jobs/${encodeURIComponent(jobId)}`, null);
    if (!upstream.ok) {
      return sendError(
        res,
        upstream.status,
        upstream.data?.message || upstream.data?.error || "Surface status failed",
        upstream.data || null
      );
    }
    return res.status(upstream.status).json(upstream.data);
  } catch (err) {
    console.error("surface proxy status error", err);
    return sendError(res, 502, "Surface proxy unreachable", err?.message || err);
  }
});

router.get("/jobs/:jobId/manifest", limiter, async (req, res) => {
  const { jobId } = req.params;
  try {
    const upstream = await forward("GET", `/jobs/${encodeURIComponent(jobId)}/manifest`, null);
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
    console.error("surface proxy manifest error", err);
    return sendError(res, 502, "Surface proxy unreachable", err?.message || err);
  }
});

module.exports = router;
