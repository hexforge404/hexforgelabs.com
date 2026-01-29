const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs/promises');
const Product = require('../models/Product');
const ProductAsset = require('../models/ProductAsset');
const { requireAdmin } = require('../middleware/requireAdmin');

const SURFACE_PUBLIC_PREFIX = (process.env.SURFACE_PUBLIC_PREFIX || '/assets/surface').replace(/\/+$/, '');
const SURFACE_OUTPUT_DIR = process.env.SURFACE_OUTPUT_DIR || '/var/www/hexforge3d/surface';
const INTERNAL_BASE_URL = process.env.INTERNAL_BASE_URL || process.env.SURFACE_INTERNAL_BASE_URL || 'http://localhost:8000';
const PUBLIC_FALLBACK_BASE = process.env.SURFACE_PUBLIC_URL_FALLBACK || process.env.PUBLIC_BASE_URL || 'https://localhost';
const STATUS_VALUES = ['draft', 'active', 'archived'];
const REQUEST_TIMEOUT_MS = 8000;

const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many product requests, please try again later',
});

const baseProductValidation = [
  body('title').optional().isString().trim().notEmpty(),
  body('name').optional().isString().trim().notEmpty(),
  body('description').optional().isString(),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().isString(),
  body('hero_image_url').optional().isString(),
  body('image').optional().isString(),
  body('status').optional().isIn(STATUS_VALUES),
  body('tags').optional().isArray(),
  body('sku').optional().isString(),
];

const promoteValidation = [
  body('job_id').isString().notEmpty(),
  body('subfolder').optional({ nullable: true }).isString(),
  body('title').isString().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('category').optional().isString(),
  body('description').optional({ nullable: true }).isString(),
  body('tags').optional({ nullable: true }).isArray(),
  body('sku').optional({ nullable: true }).isString(),
  body('freeze_assets').optional({ nullable: true }).isBoolean(),
  body('status').optional().isIn(STATUS_VALUES),
];

function normalizeState(status) {
  const map = {
    queued: 'queued',
    pending: 'queued',
    waiting: 'queued',
    running: 'running',
    processing: 'running',
    executing: 'running',
    writing: 'writing',
    finalizing: 'writing',
    complete: 'complete',
    completed: 'complete',
    done: 'complete',
    failed: 'failed',
    error: 'failed',
  };
  const key = String(status || '').toLowerCase();
  return map[key] || key || 'unknown';
}

function buildManifestPaths(jobId, subfolder) {
  const cleanSubfolder = (subfolder || '').replace(/^\/+|\/+$/g, '');
  const manifestPublicPath = [SURFACE_PUBLIC_PREFIX, cleanSubfolder, jobId, 'job_manifest.json']
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/');

  const fsPath = path.join(SURFACE_OUTPUT_DIR, cleanSubfolder, jobId, 'job_manifest.json');
  const httpUrl = new URL(manifestPublicPath.startsWith('/') ? manifestPublicPath : `/${manifestPublicPath}`, INTERNAL_BASE_URL).toString();

  return {
    publicPath: manifestPublicPath.startsWith('/') ? manifestPublicPath : `/${manifestPublicPath}`,
    fsPath,
    httpUrl,
  };
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return resp;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function loadManifest(manifestPaths) {
  const errors = [];

  try {
    const resp = await fetchWithTimeout(manifestPaths.httpUrl, REQUEST_TIMEOUT_MS);
    if (resp.ok) {
      return { manifest: await resp.json(), source: 'http', manifestUrl: manifestPaths.publicPath };
    }
    errors.push(`http ${resp.status}`);
  } catch (err) {
    errors.push(`http ${err.message}`);
  }

  try {
    const fallbackUrl = new URL(manifestPaths.publicPath, PUBLIC_FALLBACK_BASE).toString();
    if (fallbackUrl !== manifestPaths.httpUrl) {
      const resp = await fetchWithTimeout(fallbackUrl, REQUEST_TIMEOUT_MS);
      if (resp.ok) {
        return { manifest: await resp.json(), source: 'public-fallback', manifestUrl: manifestPaths.publicPath };
      }
      errors.push(`fallback ${resp.status}`);
    }
  } catch (err) {
    errors.push(`fallback ${err.message}`);
  }

  try {
    const raw = await fs.readFile(manifestPaths.fsPath, 'utf8');
    return { manifest: JSON.parse(raw), source: 'fs', manifestUrl: manifestPaths.publicPath };
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      errors.push(`fs ${err.message}`);
    }
  }

  const error = new Error('Manifest unavailable');
  error.detail = errors;
  throw error;
}

function resolveAssetUrl(raw, publicRoot, basePath) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/assets/surface/')) return value;

  const cleanBase = basePath.replace(/\/+$/, '');
  const cleanPublicRoot = (publicRoot || '').replace(/\/+$/, '');
  const rel = value.replace(/^\/+/, '');

  if (cleanPublicRoot) return `${cleanPublicRoot}/${rel}`;
  if (rel.startsWith('assets/surface/')) return `/${rel}`;
  return `${cleanBase}/${rel}`;
}

function findFirst(outputs, predicate) {
  for (const o of outputs) {
    if (predicate(o)) return o;
  }
  return null;
}

function deriveAssets(manifest, jobId, subfolder) {
  const effectiveSubfolder = subfolder || manifest.subfolder || '';
  const basePath = [SURFACE_PUBLIC_PREFIX, effectiveSubfolder, jobId].filter(Boolean).join('/').replace(/\/+/g, '/');
  const publicRoot = (manifest.public_root || manifest.public?.public_root || '').replace(/\/+$/, '');

  const outputsRaw = Array.isArray(manifest.outputs) ? manifest.outputs : [];
  const outputs = outputsRaw.map((o) => ({
    ...o,
    url: resolveAssetUrl(o.url || o.public_url || o.path || o.file, publicRoot, basePath),
  }));

  const previewCandidates = [
    manifest.public?.previews?.hero,
    manifest.public?.blender_previews_urls?.hero,
  ].filter(Boolean);

  const previewOutput = findFirst(outputs, (o) => {
    const name = String(o.name || o.label || o.url || '').toLowerCase();
    const type = String(o.type || '').toLowerCase();
    return name.includes('preview') || name.includes('hero') || type.includes('preview') || type.includes('hero');
  });

  const heroCandidate = previewCandidates[0] || previewOutput?.url || null;
  const heroPresent = !!heroCandidate || !!manifest.public_root || !!manifest.public?.public_root;

  let heroUrl = heroCandidate ? resolveAssetUrl(heroCandidate, publicRoot, basePath) : null;

  if (!heroUrl && publicRoot) heroUrl = `${publicRoot}/previews/hero.png`;
  if (!heroUrl) heroUrl = `${basePath}/previews/hero.png`;

  const stlCandidate =
    manifest.public?.enclosure?.stl ||
    findFirst(outputs, (o) => {
      const name = String(o.name || o.label || o.url || '').toLowerCase();
      const type = String(o.type || '').toLowerCase();
      return name.endsWith('.stl') || type.includes('stl');
    })?.url;

  const stlPresent = !!(stlCandidate || manifest.public?.enclosure?.stl);

  let stlUrl = resolveAssetUrl(stlCandidate, publicRoot, basePath);
  if (!stlUrl && publicRoot) stlUrl = `${publicRoot}/enclosure/enclosure.stl`;
  if (!stlUrl) stlUrl = `${basePath}/enclosure/enclosure.stl`;

  const textureUrl = resolveAssetUrl(
    findFirst(outputs, (o) => {
      const name = String(o.name || o.label || o.url || '').toLowerCase();
      const type = String(o.type || '').toLowerCase();
      return name.includes('texture') || name.endsWith('.png') || type.includes('texture') || type.includes('albedo');
    })?.url,
    publicRoot,
    basePath
  );

  const heightmapUrl = resolveAssetUrl(
    findFirst(outputs, (o) => {
      const name = String(o.name || o.label || o.url || '').toLowerCase();
      const type = String(o.type || '').toLowerCase();
      return name.includes('heightmap') || type.includes('heightmap');
    })?.url,
    publicRoot,
    basePath
  );

  const manifestUrl =
    resolveAssetUrl(
      manifest.public?.job_manifest || manifest.manifest_url || manifest.meta?.manifest_url,
      publicRoot,
      basePath
    ) || `${basePath}/job_manifest.json`;

  return {
    basePath,
    heroUrl,
    stlUrl,
    textureUrl: textureUrl || null,
    heightmapUrl: heightmapUrl || null,
    manifestUrl,
    outputs,
    publicRoot,
    subfolder: effectiveSubfolder || null,
    heroPresent,
    stlPresent,
  };
}

function toProductResponse(doc) {
  const obj = doc.toObject({ virtuals: true });
  obj.name = obj.name || obj.title;
  obj.image = obj.image || obj.hero_image_url;
  obj.category = obj.category || (Array.isArray(obj.categories) ? obj.categories[0] : undefined) || 'uncategorized';
  obj.categories = Array.isArray(obj.categories)
    ? obj.categories
    : obj.category
      ? [obj.category]
      : [];
  obj.priceFormatted = obj.priceFormatted || (typeof obj.price === 'number' ? `$${obj.price.toFixed(2)}` : '$0.00');
  return obj;
}

function buildProductPayload(body) {
  const title = (body.title || body.name || '').trim();
  const heroImage = (body.hero_image_url || body.image || '').trim();
  const category = (body.category || body.categories || '').toString().trim();
  const tags = Array.isArray(body.tags)
    ? body.tags
    : (body.tags || '')
        .toString()
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

  return {
    title,
    description: body.description || '',
    price: Number(body.price),
    status: STATUS_VALUES.includes(body.status) ? body.status : undefined,
    category: category || 'uncategorized',
    hero_image_url: heroImage || undefined,
    tags,
    sku: body.sku || undefined,
    brand: body.brand || 'HexForge',
    stock: Number.isFinite(body.stock) ? body.stock : Number(body.stock) || 0,
    isFeatured: !!body.isFeatured,
  };
}

router.get('/', productLimiter, async (req, res) => {
  try {
    const { page = 1, limit = 20, featured, category, search, raw, status, inStock } = req.query;
    const baseFilter = {};
    const andClauses = [];
    const isAdmin = !!req.session?.admin?.loggedIn;

    const parseTri = (val) => {
      const v = String(val || '').toLowerCase();
      if (v === 'true' || v === 'false' || v === 'all') return v;
      return null;
    };

    const statusParam = String(status || 'active').toLowerCase();
    const statusMode = (() => {
      if (statusParam === 'all') return isAdmin ? 'all' : 'active';
      if (STATUS_VALUES.includes(statusParam)) return statusParam;
      return 'active';
    })();

    if (statusMode === 'active') {
      andClauses.push({
        $or: [
          { status: 'active' },
          { status: { $exists: false } },
          { status: null },
          { status: '' },
        ],
      });
    } else if (statusMode !== 'all') {
      baseFilter.status = statusMode;
    }

    const featuredMode = parseTri(featured) || 'all';
    if (featuredMode === 'true') {
      baseFilter.isFeatured = true;
    } else if (featuredMode === 'false') {
      baseFilter.isFeatured = { $ne: true };
    }

    const inStockMode = parseTri(inStock) || 'all';
    if (inStockMode === 'true') {
      baseFilter.stock = { $gt: 0 };
    } else if (inStockMode === 'false') {
      baseFilter.stock = { $lte: 0 };
    }

    if (category) baseFilter.category = category;

    if (search) {
      andClauses.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (andClauses.length) {
      baseFilter.$and = andClauses;
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [products, total] = await Promise.all([
      Product.find(baseFilter)
        .sort({ created_at: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(baseFilter),
    ]);

    const response = products.map(toProductResponse);

    if (raw === 'true') {
      return res.json(response);
    }

    res.json({
      products: response, // legacy-friendly alias
      data: response,
      meta: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/:id', productLimiter, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const isAdmin = !!req.session?.admin?.loggedIn;
    if (!isAdmin && product.status && product.status !== 'active') {
      return res.status(404).json({ error: 'Product not available' });
    }

    res.json(toProductResponse(product));
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', productLimiter, baseProductValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payload = buildProductPayload(req.body);
    if (!payload.title) {
      return res.status(400).json({ error: 'Product title is required' });
    }

    const existing = await Product.findOne({ title: payload.title });
    if (existing) {
      return res.status(400).json({ error: 'Product already exists' });
    }

    const product = await Product.create(payload);
    res.status(201).json(toProductResponse(product));
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      error: 'Failed to add product',
      details: error.message,
    });
  }
});

router.put('/:id', productLimiter, baseProductValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payload = buildProductPayload(req.body);
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(toProductResponse(updatedProduct));
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      error: 'Failed to update product',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.delete('/:id', productLimiter, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Product deleted successfully',
      deletedId: deletedProduct._id,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      error: 'Failed to delete product',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.post('/from-surface-job', productLimiter, requireAdmin, promoteValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      job_id: jobId,
      subfolder = '',
      title,
      price,
      category = 'surface',
      description = '',
      tags = [],
      sku = null,
      freeze_assets: freezeAssets = false,
    } = req.body;

    const manifestPaths = buildManifestPaths(jobId, subfolder);
    const { manifest, manifestUrl } = await loadManifest(manifestPaths);
    const state = normalizeState(
      manifest.status ||
      manifest.state ||
      manifest.result?.status ||
      manifest.result?.state ||
      manifest.meta?.status ||
      manifest.meta?.state
    );

    const derived = deriveAssets(manifest, jobId, subfolder);
    const artifactsPresent = derived.heroPresent && derived.stlPresent;

    if (state !== 'complete' && !(state === 'unknown' && artifactsPresent)) {
      return res.status(400).json({
        error: 'Surface job is not complete',
        status: state,
      });
    }

    if (!derived.heroUrl) {
      return res.status(400).json({ error: 'Hero preview missing in manifest outputs' });
    }
    if (!derived.stlUrl) {
      return res.status(400).json({ error: 'STL output missing in manifest outputs' });
    }

    const existing = await Product.findOne({ 'source_job.job_id': jobId, 'source_job.subfolder': derived.subfolder });
    if (existing) {
      return res.status(409).json({ error: 'Product already exists for this job', product_id: existing._id });
    }

    const requestedStatus = String(req.body.status || '').toLowerCase();
    const statusValue = STATUS_VALUES.includes(requestedStatus) ? requestedStatus : 'active';
    const resolvedSku = sku || `surf-${jobId}`;

      const product = await Product.create({
        // ensure unique name index is populated; align with title to avoid null duplicates
        name: title,
        title,
        description,
        price,
        status: statusValue,
        category,
        hero_image_url: derived.heroUrl,
        tags,
        sku: resolvedSku,
        freeze_assets: !!freezeAssets,
        source_job: {
          job_id: jobId,
          subfolder: derived.subfolder,
          manifest_url: manifestUrl || derived.manifestUrl,
          public_root: derived.publicRoot || null,
        },
        brand: 'HexForge',
        stock: 0,
        isFeatured: false,
      });

    const baseMeta = {
      job_id: jobId,
      subfolder: derived.subfolder,
      source: 'surface-manifest',
      freeze: !!freezeAssets,
    };

    const assets = [
      { product: product._id, type: 'hero', url: derived.heroUrl, meta: baseMeta },
      { product: product._id, type: 'stl', url: derived.stlUrl, meta: baseMeta },
    ];

    if (derived.textureUrl) {
      assets.push({ product: product._id, type: 'texture', url: derived.textureUrl, meta: baseMeta });
    }
    if (derived.heightmapUrl) {
      assets.push({ product: product._id, type: 'heightmap', url: derived.heightmapUrl, meta: baseMeta });
    }
    if (derived.manifestUrl || manifestUrl) {
      assets.push({ product: product._id, type: 'manifest', url: derived.manifestUrl || manifestUrl, meta: baseMeta });
    }

    await ProductAsset.insertMany(assets);

    const response = toProductResponse(product);
    response.assets = assets.map((a) => ({ type: a.type, url: a.url }));

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error promoting surface job:', error);
    res.status(500).json({
      error: 'Failed to promote surface job',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
