import axios from "axios";

const API_BASE = (() => {
  const raw = (process.env.VITE_API_BASE_URL || process.env.REACT_APP_API_BASE_URL || "").trim();
  return raw ? raw.replace(/\/+$/, "") : "";
})();

const SURFACE_BASES = [API_BASE ? `${API_BASE}/api/surface` : "/api/surface"];
const HEIGHTMAP_BASES = [API_BASE ? `${API_BASE}/api/heightmap` : "/api/heightmap"];

class SurfaceApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "SurfaceApiError";
    this.status = status;
    this.data = data;
  }
}

function normalizeError(err) {
  const status = err?.response?.status ?? 0;
  const data = err?.response?.data;
  const message =
    data?.message ||
    data?.error ||
    data?.detail ||
    err?.message ||
    "Surface request failed";
  return new SurfaceApiError(message, status, data);
}

const client = axios.create({
  timeout: 15000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

async function request(method, path, body) {
  let lastErr = null;

  for (const base of SURFACE_BASES) {
    try {
      const url = `${base}${path}`;
      const res = await client.request({ method, url, data: body });
      return res.data;
    } catch (err) {
      const normalized = normalizeError(err);
      lastErr = normalized;

      const status = normalized.status;
      const retriable = status === 0 || status >= 500 || status === 404;
      const notLastBase = base !== SURFACE_BASES[SURFACE_BASES.length - 1];
      if (retriable && notLastBase) {
        continue;
      }
      break;
    }
  }

  throw lastErr || new SurfaceApiError("Surface request failed", 0, null);
}

async function requestHeightmap(method, path, body) {
  let lastErr = null;
  let notFoundCount = 0;

  for (const base of HEIGHTMAP_BASES) {
    try {
      const url = `${base}${path}`;
      const res = await client.request({ method, url, data: body });
      return { data: res.data, base };
    } catch (err) {
      const normalized = normalizeError(err);
      lastErr = normalized;
      if (normalized.status === 404) {
        notFoundCount += 1;
      }

      const status = normalized.status;
      const retriable = status === 0 || status >= 500 || status === 404;
      const notLastBase = base !== HEIGHTMAP_BASES[HEIGHTMAP_BASES.length - 1];
      if (retriable && notLastBase) {
        continue;
      }
      break;
    }
  }

  if (lastErr) {
    lastErr.endpointNotFound = lastErr.status === 404 && notFoundCount === HEIGHTMAP_BASES.length;
  }

  throw lastErr || new SurfaceApiError("Heightmap request failed", 0, null);
}

export async function createSurfaceJob(payload = {}) {
  const data = await request("post", "/jobs", payload);
  if (!data?.job_id) {
    throw new SurfaceApiError("Surface job id missing in response", 502, data);
  }
  return data;
}

export async function getSurfaceJobStatus(jobId) {
  if (!jobId) {
    throw new SurfaceApiError("job_id is required", 400);
  }
  return request("get", `/jobs/${encodeURIComponent(jobId)}`);
}

export async function getSurfaceManifest(jobId) {
  if (!jobId) {
    throw new SurfaceApiError("job_id is required", 400);
  }
  return request("get", `/jobs/${encodeURIComponent(jobId)}/manifest`);
}

export async function getSurfaceLatest(limit = 10) {
  const n = Number.parseInt(limit, 10);
  const safeLimit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 50) : 10;
  const qs = `?limit=${safeLimit}`;
  return request("get", `/latest${qs}`);
}

export async function getHeightmapLatest(limit = 25) {
  const n = Number.parseInt(limit, 10);
  const safeLimit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 50) : 25;
  const qs = `?limit=${safeLimit}`;
  const { data, base } = await requestHeightmap("get", `/latest${qs}`);
  return { ...(data || {}), source_base: base };
}

export { SurfaceApiError };
