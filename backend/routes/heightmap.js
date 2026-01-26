const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const {
  assertJobManifest,
  assertJobStatusEnvelope,
  buildErrorEnvelope,
  ContractError,
} = require("../utils/contractValidation");

const router = express.Router();

const ENGINE_BASE_URL = process.env.HEIGHTMAPENGINE_URL || "http://heightmapengine:8093";
const SERVICE_NAME = process.env.HEIGHTMAP_SERVICE_NAME || "heightmapengine";
const HEIGHTMAP_OUTPUT_DIR = process.env.HEIGHTMAP_OUTPUT_DIR || "/var/www/hexforge3d/output";
const HEIGHTMAP_PUBLIC_PREFIX = process.env.HEIGHTMAP_PUBLIC_PREFIX || "/assets/heightmap";
const HEIGHTMAP_DEBUG = (process.env.HEIGHTMAP_DEBUG || "").toLowerCase() === "1";

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

function debugLog(...args) {
  if (HEIGHTMAP_DEBUG) {
    console.warn("[heightmap-debug]", ...args);
  }
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
  const prefix = HEIGHTMAP_PUBLIC_PREFIX.replace(/\/$/, "");
  return [prefix, subfolder, jobId].filter(Boolean).join("/").replace(/\/+/g, "/");
}

function resolveAssetUrl(maybeRelative, publicRoot) {
  if (!maybeRelative) return null;
  const raw = String(maybeRelative).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/assets/heightmap/")) return raw;

  const cleaned = raw.replace(/^\/+/, "");
  if (cleaned.startsWith("assets/heightmap/")) return `/${cleaned}`;

  const root = publicRoot || HEIGHTMAP_PUBLIC_PREFIX.replace(/\/$/, "");
  return `${root}/${cleaned}`.replace(/\/+/g, "/");
}

async function findExistingManifest(jobDir) {
  const candidates = ["job_manifest.json", "job.json", "manifest.json"];
  for (const name of candidates) {
    const full = path.join(jobDir, name);
    if (await fileExists(full)) {
      return { name, full };
    }
  }
  return null;
}

function isImageFile(name) {
  return /\.(png|jpg|jpeg|webp)$/i.test(name || "");
}

function looksLikeHeightmap(name) {
  const lower = String(name || "").toLowerCase();
  return lower.includes("heightmap") || /(^|[\/_-])height([._-]|$)/.test(lower);
}

async function pickHeightmapArtifacts(jobDir, entries, manifest) {
  const extractUrl = (val) => {
    if (!val) return null;
    if (typeof val === "string") return val;
    if (typeof val === "object") return val.url || val.path || val.public_url || null;
    return null;
  };

  const pickFromList = (list, predicate) => {
    const found = list.find((item) => predicate(item));
    return found ? found.name || found : null;
  };

  const textureEntries = async () => {
    const hasTextures = entries.some((e) => e.isDirectory() && e.name === "textures");
    if (!hasTextures) return { primary: null, secondary: null, any: null };

    const texturesDir = path.join(jobDir, "textures");
    let files = [];
    try {
      files = await fs.readdir(texturesDir, { withFileTypes: true });
    } catch (err) {
      debugLog("textures_read_error", { job_dir: jobDir, err });
      return { primary: null, secondary: null, any: null };
    }

    const primary = pickFromList(files, (e) => e.isFile() && /^heightmap\.(png|jpg|jpeg|webp)$/i.test(e.name));
    const secondary = pickFromList(files, (e) => e.isFile() && looksLikeHeightmap(e.name) && isImageFile(e.name));
    const any = pickFromList(files, (e) => e.isFile() && isImageFile(e.name));

    return {
      primary: primary ? `textures/${primary}` : null,
      secondary: secondary ? `textures/${secondary}` : null,
      any: any ? `textures/${any}` : null,
    };
  };

  const manifestCandidates = [
    extractUrl(manifest?.public?.heightmap_url),
    extractUrl(manifest?.heightmap_url),
    extractUrl(manifest?.public?.heightmap_png),
    extractUrl(manifest?.outputs?.heightmap),
    extractUrl(manifest?.outputs?.heightmap_png),
    extractUrl(manifest?.outputs?.heightmapUrl),
  ].filter(Boolean);

  const manifestPreviewCandidates = [
    extractUrl(manifest?.public?.previews?.hero),
    extractUrl(manifest?.public?.hero),
    extractUrl(manifest?.public?.previews?.iso),
    extractUrl(manifest?.public?.previews?.top),
    extractUrl(manifest?.public?.previews?.side),
  ].filter(Boolean);

  const texture = await textureEntries();

  const directPrimary = pickFromList(entries, (e) => e.isFile() && /^heightmap\.(png|jpg|jpeg|webp)$/i.test(e.name));
  const directHeightish = pickFromList(entries, (e) => e.isFile() && looksLikeHeightmap(e.name) && isImageFile(e.name));
  const directAny = pickFromList(entries, (e) => e.isFile() && isImageFile(e.name));

  const manifestHeight = manifestCandidates.find((c) => looksLikeHeightmap(path.basename(c)));
  const manifestAny = manifestCandidates.find(Boolean) || null;

  const preferredHeightmap =
    texture.primary ||
    texture.secondary ||
    directPrimary ||
    directHeightish ||
    manifestHeight ||
    directAny ||
    null;

  const fallbackHeightmap = preferredHeightmap || texture.any || manifestAny || manifestPreviewCandidates[0] || null;
  const previewRel = manifestPreviewCandidates[0] || texture.any || directAny || null;

  return {
    heightmapRel: preferredHeightmap,
    previewRel,
    fallbackRel: fallbackHeightmap,
  };
}

async function collectHeightmapJobs(dirPath, subfolder = "") {
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
    const jobEntries = await fs.readdir(jobDir, { withFileTypes: true });

    const manifestInfo = await findExistingManifest(jobDir);
    let manifest = null;
    if (manifestInfo) {
      try {
        const raw = await fs.readFile(manifestInfo.full, "utf8");
        manifest = JSON.parse(raw);
      } catch (err) {
        debugLog("manifest_parse_error", { job_id: jobId, err });
      }
    }

    const hasChildDirs = jobEntries.some((e) => e.isDirectory());
    const hasDirectAssets = jobEntries.some((e) => e.isFile());

    // If no manifest and appears to be a container folder, recurse instead of treating as job.
    if (!manifestInfo && hasChildDirs && !hasDirectAssets) {
      const nested = await collectHeightmapJobs(jobDir, subfolder ? `${subfolder}/${jobId}` : jobId);
      jobs.push(...nested);
      continue;
    }

    const publicRoot = resolvePublicRoot(subfolder, jobId);
    const manifestUrl = `${publicRoot}/${manifestInfo ? manifestInfo.name : "job_manifest.json"}`;

    let createdAtMs = null;
    try {
      const statTarget = manifestInfo ? manifestInfo.full : jobDir;
      const stats = await fs.stat(statTarget);
      createdAtMs = stats.mtimeMs || stats.ctimeMs || Date.now();
    } catch (err) {
      debugLog("stat_error", { job_id: jobId, err });
    }

    const artifactPick = await pickHeightmapArtifacts(jobDir, jobEntries, manifest);
    const heightmapUrl = resolveAssetUrl(artifactPick.heightmapRel || artifactPick.fallbackRel, publicRoot);
    const previewUrl = resolveAssetUrl(artifactPick.previewRel || artifactPick.heightmapRel || artifactPick.fallbackRel, publicRoot);
    const heightmapSource = artifactPick.heightmapRel
      ? "artifact"
      : artifactPick.fallbackRel === artifactPick.previewRel
        ? "preview"
        : artifactPick.fallbackRel
          ? "fallback"
          : null;

    jobs.push({
      job_id: jobId,
      job_name: manifest?.job_name || manifest?.name || manifest?.meta?.name || jobId,
      subfolder: subfolder || "",
      manifest_url: manifestUrl,
      public_root: publicRoot,
      heightmap_url: heightmapUrl,
      preview_url: previewUrl,
      heightmap_source: heightmapSource,
      created_at: createdAtMs || Date.now(),
    });
  }

  return jobs;
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

router.get("/latest", async (req, res) => {
  try {
    const n = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 50) : 10;

    const jobs = await collectHeightmapJobs(HEIGHTMAP_OUTPUT_DIR, "");
    const sorted = jobs
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
      .slice(0, limit);

    return res.json({ ok: true, count: sorted.length, items: sorted });
  } catch (err) {
    console.error("heightmap latest error", err);
    return res.status(500).json({ ok: false, message: "Unable to list heightmap jobs", detail: err?.message || err });
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
