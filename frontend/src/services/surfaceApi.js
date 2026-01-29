import axios from "axios";

const SURFACE_BASES = ["/api/store/surface", "/api/surface"];

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

export { SurfaceApiError };
