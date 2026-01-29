const express = require("express");
const {
  assertJobManifest,
  assertJobStatusEnvelope,
  buildErrorEnvelope,
  ContractError,
} = require("../utils/contractValidation");

const router = express.Router();

const ENGINE_BASE_URL = process.env.HEIGHTMAPENGINE_URL || "http://heightmapengine:8093";
const SERVICE_NAME = process.env.HEIGHTMAP_SERVICE_NAME || "heightmapengine";

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
    throw new ContractError("UPSTREAM_NON_JSON", `Expected JSON from ${url}`);
  }

  return { status: resp.status, data };
}

function handleError(res, err, jobId) {
  if (err instanceof ContractError) {
    console.error("heightmap contract error", err.code, err.detail);
    return res
      .status(502)
      .json(buildErrorEnvelope(jobId || err.jobId, SERVICE_NAME, err.code, err.detail));
  }

  console.error("heightmap upstream error", err);
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
    const { status, data } = await proxyJson("/api/heightmap/jobs", {
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
    const { status, data } = await proxyJson(`/api/heightmap/jobs/${jobId}`);
    const validated = assertJobStatusEnvelope(data, { requirePublicOnComplete: true });
    return res.status(status).json(validated);
  } catch (err) {
    return handleError(res, err, jobId);
  }
});

router.get("/jobs/:jobId/assets", async (req, res) => {
  const { jobId } = req.params;
  try {
    const { status, data } = await proxyJson(`/api/heightmap/jobs/${jobId}/assets`);
    const manifest = assertJobManifest(data);
    return res.status(status).json(manifest);
  } catch (err) {
    return handleError(res, err, jobId);
  }
});

router.get("/v1/jobs", async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10);
    const offset = Number.parseInt(req.query.offset, 10);
    const params = new URLSearchParams();
    if (Number.isFinite(limit)) params.set("limit", Math.min(Math.max(limit, 1), 50));
    if (Number.isFinite(offset)) params.set("offset", Math.max(offset, 0));

    const qs = params.toString();
    const path = qs ? `/api/heightmap/v1/jobs?${qs}` : `/api/heightmap/v1/jobs`;
    const { status, data } = await proxyJson(path);
    return res.status(status).json(data);
  } catch (err) {
    return handleError(res, err);
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
