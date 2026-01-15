const express = require("express");
const {
  assertJobManifest,
  assertJobStatusEnvelope,
  buildErrorEnvelope,
  ContractError,
} = require("../utils/contractValidation");

const router = express.Router();

const ENGINE_BASE_URL = process.env.GLYPHENGINE_URL || "http://glyphengine:8092";
const SERVICE_NAME = process.env.SURFACE_SERVICE_NAME || "glyphengine";

async function proxyJson(path, init = {}) {
  const url = `${ENGINE_BASE_URL}${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new ContractError(
      "UPSTREAM_NON_JSON",
      `Expected JSON from ${url}`
    );
  }

  return { status: resp.status, data };
}

function handleError(res, err, jobId) {
  if (err instanceof ContractError) {
    console.error("surface contract error", err.code, err.detail);
    return res
      .status(502)
      .json(buildErrorEnvelope(jobId || err.jobId, SERVICE_NAME, err.code, err.detail));
  }

  console.error("surface upstream error", err);
  return res
    .status(502)
    .json(
      buildErrorEnvelope(jobId, SERVICE_NAME, "UPSTREAM_ERROR", err.message || "Unknown upstream error")
    );
}

router.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME, upstream: ENGINE_BASE_URL });
});

router.post("/jobs", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { status, data } = await proxyJson("/api/surface/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const validated = assertJobStatusEnvelope(data, { requirePublicOnComplete: true });
    return res.status(status).json(validated);
  } catch (err) {
    return handleError(res, err, req.body?.job_id);
  }
});

router.get("/jobs/:jobId", async (req, res) => {
  const { jobId } = req.params;
  try {
    const { status, data } = await proxyJson(`/api/surface/jobs/${jobId}`);
    const validated = assertJobStatusEnvelope(data, { requirePublicOnComplete: true });
    return res.status(status).json(validated);
  } catch (err) {
    return handleError(res, err, jobId);
  }
});

router.get("/jobs/:jobId/assets", async (req, res) => {
  const { jobId } = req.params;
  try {
    const { status, data } = await proxyJson(`/api/surface/jobs/${jobId}/assets`);
    const manifest = assertJobManifest(data);
    return res.status(status).json(manifest);
  } catch (err) {
    return handleError(res, err, jobId);
  }
});

router.get("/docs", async (req, res) => {
  try {
    const url = `${ENGINE_BASE_URL}/docs`;
    const upstream = await fetch(url);
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "text/html");
    return res.send(body);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get("/openapi.json", async (req, res) => {
  try {
    const { status, data } = await proxyJson("/openapi.json");
    return res.status(status).json(data);
  } catch (err) {
    return handleError(res, err);
  }
});

module.exports = router;
