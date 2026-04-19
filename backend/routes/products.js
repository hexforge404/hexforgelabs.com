const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs/promises');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Product = require('../models/Product');
const ProductAsset = require('../models/ProductAsset');
const CustomOrder = require('../models/CustomOrder');
const PrintJob = require('../models/PrintJob');
const PromoCode = require('../models/PromoCode');
const { requireAdmin } = require('../middleware/requireAdmin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { roundMoney, calculateDeposit, applyPromo } = require('../utils/pricing');
const {
  normalizeCustomOrderImagePath,
} = require('../utils/customOrderUtils');
const { copyOrExportSourceImagesToSharedFolder } = require('../utils/sourceAssetUtils');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
  url: 'https://api.mailgun.net'
});

const SURFACE_PUBLIC_PREFIX = (process.env.SURFACE_PUBLIC_PREFIX || '/assets/surface').replace(/\/+$/, '');
const SURFACE_OUTPUT_DIR = process.env.SURFACE_OUTPUT_DIR || '/var/www/hexforge3d/surface';
const INTERNAL_BASE_URL = process.env.INTERNAL_BASE_URL || process.env.SURFACE_INTERNAL_BASE_URL || 'http://localhost:8000';
const STATUS_VALUES = ['draft', 'active', 'archived'];
const REQUEST_TIMEOUT_MS = 8000;

// Configure multer for custom order photo uploads
const customOrderStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, CUSTOM_ORDER_UPLOAD_TMP_DIR);
  },
  filename(req, file, cb) {
    cb(null, safeCustomOrderFilename(file.originalname));
  }
});

const customOrderUpload = multer({
  storage: customOrderStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const CUSTOM_ORDER_UPLOAD_DIR = path.join(__dirname, '../uploads/custom-orders');
const CUSTOM_ORDER_UPLOAD_TMP_DIR = path.join(CUSTOM_ORDER_UPLOAD_DIR, 'tmp');

const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // ignore if already exists
  }
};

ensureDir(CUSTOM_ORDER_UPLOAD_TMP_DIR);

const getCustomOrderUploadDir = (orderId) => path.join(CUSTOM_ORDER_UPLOAD_DIR, orderId);
const getCustomOrderPublicUrl = (relativePath) => `/${relativePath.replace(/^\/+/, '')}`;
const getCustomOrderRelativePath = (orderId, filename) => `uploads/custom-orders/${orderId}/${filename}`;

const getRequestIdempotencyKey = (req, fallbackData = {}) => {
  const headerKey = String(req.headers['x-idempotency-key'] || '').trim();
  if (headerKey) return headerKey;

  const payload = {
    sessionId: req.sessionID || '',
    path: req.originalUrl || '',
    method: req.method || 'POST',
    ...fallbackData,
  };
  return `auto:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
};

const safeCustomOrderFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext)
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120) || 'image';
  return `${base}-${Date.now()}${ext}`;
};

const buildCustomOrderImageMeta = (file, orderId, panel) => {
  const filename = path.basename(file.path);
  const relativePath = getCustomOrderRelativePath(orderId, filename);
  return {
    path: getCustomOrderPublicUrl(relativePath),
    publicUrl: getCustomOrderPublicUrl(relativePath),
    relativePath,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
    panel,
    panelLabel: `Panel ${panel}`,
  };
};

const normalizePersistedCustomOrder = (customOrder) => {
  const obj = customOrder.toObject ? customOrder.toObject({ getters: true, virtuals: false }) : { ...customOrder };
  if (Array.isArray(obj.images)) {
    obj.images = obj.images.map((img) => ({
      ...img,
      path: normalizeCustomOrderImagePath(img.path || img.publicUrl || img.relativePath),
      publicUrl: normalizeCustomOrderImagePath(img.publicUrl || img.path || img.relativePath),
      relativePath: img.relativePath || String(img.path || img.publicUrl || '').replace(/^\//, ''),
    }));
  }
  if (obj.nightlightAddon?.separateImage) {
    obj.nightlightAddon.separateImage.path = normalizeCustomOrderImagePath(obj.nightlightAddon.separateImage.path || obj.nightlightAddon.separateImage.publicUrl || obj.nightlightAddon.separateImage.relativePath);
    obj.nightlightAddon.separateImage.publicUrl = normalizeCustomOrderImagePath(obj.nightlightAddon.separateImage.publicUrl || obj.nightlightAddon.separateImage.path || obj.nightlightAddon.separateImage.relativePath);
    obj.nightlightAddon.separateImage.relativePath = obj.nightlightAddon.separateImage.relativePath || String(obj.nightlightAddon.separateImage.path || obj.nightlightAddon.separateImage.publicUrl || '').replace(/^\//, '');
  }
  obj.imagesCount = Array.isArray(obj.images) ? obj.images.length : 0;
  return obj;
};

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
  body('imageGallery').optional().isArray(),
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

const getBaseUrl = () => {
  let url = process.env.BASE_URL || 'https://hexforgelabs.com';
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, '')}`;
  }
  return url.replace(/\/+$/, '');
};

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

const getOrderStatusUrl = (orderId) => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/order/${encodeURIComponent(orderId)}`;
};

const getAddressLine = (order) => {
  const address = order.customer?.shippingAddress || {};
  return `${address.street || ''}${address.city ? `, ${address.city}` : ''}${address.state ? `, ${address.state}` : ''}${address.zipCode ? ` ${address.zipCode}` : ''}${address.country ? `, ${address.country}` : ''}`.trim();
};

const getDiscountSummary = (order) => {
  if (!order.discountAmount || order.discountAmount <= 0) return null;
  const typeLabel = order.discountType === 'percentage'
    ? `${order.discountValue}% off`
    : `${formatMoney(order.discountValue)} off`;
  return {
    originalPrice: formatMoney(order.originalPrice || order.totalPrice),
    discountAmount: formatMoney(order.discountAmount),
    discountTypeLabel: typeLabel,
    promoCode: order.promoCode || 'N/A',
    discountedTotal: formatMoney(order.discountedTotal || order.totalPrice),
  };
};

const buildCustomOrderConfirmationEmail = (order) => {
  const addressLine = getAddressLine(order);
  const discount = getDiscountSummary(order);
  const statusUrl = getOrderStatusUrl(order.orderId);
  const imageCount = order.images?.length || 0;

  const text = `Thank you for your custom lamp order!\n\nOrder ID: ${order.orderId}\nCustomer: ${order.customer.name}\nProduct: ${order.productName}\nSize: ${order.size}\nPanels: ${order.panels}\nLight Type: ${order.lightType}\nUploaded Images: ${imageCount}\n\nPricing\nTotal Price: ${formatMoney(order.totalPrice)}${discount ? `\nOriginal Price: ${discount.originalPrice}\nDiscount: ${discount.discountAmount} (${discount.discountTypeLabel})\nPromo Code: ${discount.promoCode}\nDiscounted Total: ${discount.discountedTotal}` : ''}\nDeposit Due: ${formatMoney(order.depositAmount)}\nRemaining Balance: ${formatMoney(order.remainingBalance)}\nStatus: ${order.status}\n\nShipping Address: ${addressLine}\n\nNext steps:\n- Complete your deposit payment if you have not already\n- We will review your images and begin production\n- You can check status any time at ${statusUrl}`;

  const html = `<p>Thank you for your custom lamp order!</p>
    <p><strong>Order ID:</strong> ${order.orderId}</p>
    <p><strong>Customer:</strong> ${order.customer.name}</p>
    <p><strong>Product:</strong> ${order.productName}</p>
    <p><strong>Size:</strong> ${order.size}</p>
    <p><strong>Panels:</strong> ${order.panels}</p>
    <p><strong>Light Type:</strong> ${order.lightType}</p>
    <p><strong>Uploaded Images:</strong> ${imageCount}</p>
    <h4>Pricing</h4>
    <p><strong>Total Price:</strong> ${formatMoney(order.totalPrice)}</p>${discount ? `
    <p><strong>Original Price:</strong> ${discount.originalPrice}</p>
    <p><strong>Discount:</strong> ${discount.discountAmount} (${discount.discountTypeLabel})</p>
    <p><strong>Promo Code:</strong> ${discount.promoCode}</p>
    <p><strong>Discounted Total:</strong> ${discount.discountedTotal}</p>` : ''}
    <p><strong>Deposit Due:</strong> ${formatMoney(order.depositAmount)}</p>
    <p><strong>Remaining Balance:</strong> ${formatMoney(order.remainingBalance)}</p>
    <p><strong>Status:</strong> ${order.status}</p>
    <h4>Shipping</h4>
    <p>${addressLine}</p>
    <h4>Next steps</h4>
    <ul>
      <li>Complete your deposit payment if you have not already.</li>
      <li>We will review your images and begin production.</li>
      <li>Check status any time: <a href="${statusUrl}">${statusUrl}</a></li>
    </ul>`;

  return { text, html };
};

const buildCustomOrderAdminEmail = (order) => {
  const addressLine = getAddressLine(order);
  const discount = getDiscountSummary(order);
  const statusUrl = getOrderStatusUrl(order.orderId);
  const imageCount = order.images?.length || 0;

  const text = `New custom lamp order received.\n\nOrder ID: ${order.orderId}\nCustomer: ${order.customer.name}\nEmail: ${order.customer.email}\nPhone: ${order.customer.phone}\nProduct: ${order.productName}\nSize: ${order.size}\nPanels: ${order.panels}\nLight Type: ${order.lightType}\nUploaded Images: ${imageCount}\n\nPricing\nTotal Price: ${formatMoney(order.totalPrice)}${discount ? `\nOriginal Price: ${discount.originalPrice}\nDiscount: ${discount.discountAmount} (${discount.discountTypeLabel})\nPromo Code: ${discount.promoCode}\nDiscounted Total: ${discount.discountedTotal}` : ''}\nDeposit Due: ${formatMoney(order.depositAmount)}\nRemaining Balance: ${formatMoney(order.remainingBalance)}\nStatus: ${order.status}\n\nShipping Address: ${addressLine}\n\nStatus URL: ${statusUrl}`;

  const html = `<p><strong>New custom lamp order received.</strong></p>
    <p><strong>Order ID:</strong> ${order.orderId}</p>
    <p><strong>Customer:</strong> ${order.customer.name}</p>
    <p><strong>Email:</strong> ${order.customer.email}</p>
    <p><strong>Phone:</strong> ${order.customer.phone}</p>
    <p><strong>Product:</strong> ${order.productName}</p>
    <p><strong>Size:</strong> ${order.size}</p>
    <p><strong>Panels:</strong> ${order.panels}</p>
    <p><strong>Light Type:</strong> ${order.lightType}</p>
    <p><strong>Uploaded Images:</strong> ${imageCount}</p>
    <h4>Pricing</h4>
    <p><strong>Total Price:</strong> ${formatMoney(order.totalPrice)}</p>${discount ? `
    <p><strong>Original Price:</strong> ${discount.originalPrice}</p>
    <p><strong>Discount:</strong> ${discount.discountAmount} (${discount.discountTypeLabel})</p>
    <p><strong>Promo Code:</strong> ${discount.promoCode}</p>
    <p><strong>Discounted Total:</strong> ${discount.discountedTotal}</p>` : ''}
    <p><strong>Deposit Due:</strong> ${formatMoney(order.depositAmount)}</p>
    <p><strong>Remaining Balance:</strong> ${formatMoney(order.remainingBalance)}</p>
    <p><strong>Status:</strong> ${order.status}</p>
    <h4>Shipping</h4>
    <p>${addressLine}</p>
    <p>Status URL: <a href="${statusUrl}">${statusUrl}</a></p>`;

  return { text, html };
};

const buildCustomOrderDepositEmail = (order) => {
  const statusUrl = getOrderStatusUrl(order.orderId);

  const text = `Deposit received for your custom lamp order.\n\nOrder ID: ${order.orderId}\nDeposit Paid: ${formatMoney(order.depositAmount)}\nRemaining Balance: ${formatMoney(order.remainingBalance)}\nStatus: ${order.status}\n\nTrack status: ${statusUrl}`;

  const html = `<p><strong>Deposit received for your custom lamp order.</strong></p>
    <p><strong>Order ID:</strong> ${order.orderId}</p>
    <p><strong>Deposit Paid:</strong> ${formatMoney(order.depositAmount)}</p>
    <p><strong>Remaining Balance:</strong> ${formatMoney(order.remainingBalance)}</p>
    <p><strong>Status:</strong> ${order.status}</p>
    <p>Track status: <a href="${statusUrl}">${statusUrl}</a></p>`;

  return { text, html };
};

const sendCustomOrderNotification = async (order) => {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_FROM_EMAIL) {
    console.warn('⚠️ Mailgun credentials missing. Skipping custom order email.');
    return;
  }

  const customerEmail = order.customer?.email;

  if (customerEmail && !order.confirmationSent) {
    const { text, html } = buildCustomOrderConfirmationEmail(order);
    try {
      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `HexForge Labs <${process.env.MAILGUN_FROM_EMAIL}>`,
        to: [customerEmail],
        subject: `Custom Lamp Order Confirmation: ${order.orderId}`,
        text,
        html,
      });
      order.confirmationSent = true;
      order.lastEmailSentAt = new Date();
      console.log(`📧 Customer confirmation email sent for ${order.orderId}`);
    } catch (emailErr) {
      console.warn(`⚠️ Failed to send customer confirmation email for ${order.orderId}:`, emailErr.message || emailErr);
    }
  }

  const adminRecipients = [process.env.TO_EMAIL, process.env.BCC_EMAIL].filter(Boolean);
  if (adminRecipients.length && !order.adminNotificationSent) {
    const { text, html } = buildCustomOrderAdminEmail(order);
    try {
      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `HexForge Labs <${process.env.MAILGUN_FROM_EMAIL}>`,
        to: adminRecipients,
        subject: `New Custom Lamp Order: ${order.orderId}`,
        text,
        html,
      });
      order.adminNotificationSent = true;
      order.lastEmailSentAt = new Date();
      console.log(`📧 Admin notification email sent for ${order.orderId}`);
    } catch (emailErr) {
      console.warn(`⚠️ Failed to send admin notification email for ${order.orderId}:`, emailErr.message || emailErr);
    }
  }
};

const sendCustomOrderDepositConfirmation = async (order) => {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_FROM_EMAIL) {
    console.warn('⚠️ Mailgun credentials missing. Skipping deposit confirmation email.');
    return;
  }

  if (!order.customer?.email || order.depositConfirmationSent) return;

  const { text, html } = buildCustomOrderDepositEmail(order);
  try {
    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: `HexForge Labs <${process.env.MAILGUN_FROM_EMAIL}>`,
      to: [order.customer.email],
      subject: `Deposit Received: ${order.orderId}`,
      text,
      html,
    });
    order.depositConfirmationSent = true;
    order.lastEmailSentAt = new Date();
    console.log(`📧 Deposit confirmation email sent for ${order.orderId}`);
  } catch (emailErr) {
    console.warn(`⚠️ Failed to send deposit confirmation email for ${order.orderId}:`, emailErr.message || emailErr);
  }
};

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
  ];

  let heroUrl = previewCandidates
    .map((c) => resolveAssetUrl(c, publicRoot, basePath))
    .find(Boolean);

  if (!heroUrl && publicRoot) heroUrl = `${publicRoot}/previews/hero.png`;
  if (!heroUrl) heroUrl = `${basePath}/previews/hero.png`;

  const stlCandidate =
    manifest.public?.enclosure?.stl ||
    findFirst(outputs, (o) => {
      const name = String(o.name || o.label || o.url || '').toLowerCase();
      const type = String(o.type || '').toLowerCase();
      return name.endsWith('.stl') || type.includes('stl');
    })?.url;

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
  };
}

function makeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function toProductResponse(doc) {
  const obj = doc.toObject({ virtuals: true });
  obj.title = obj.title || obj.name || 'Untitled product';
  obj.name = obj.name || obj.title;
  obj.hero_image_url = obj.hero_image_url || obj.image || null;
  obj.image = obj.image || obj.hero_image_url || null;
  obj.imageGallery = Array.isArray(obj.imageGallery)
    ? obj.imageGallery.filter(Boolean)
    : [];
  obj.price = typeof obj.price === 'number' ? obj.price : Number(obj.price) || 0;
  obj.priceFormatted = obj.priceFormatted || `$${obj.price.toFixed(2)}`;
  obj.slug = obj.slug || makeSlug(obj.title);
  obj.status = obj.status || 'active';
  return obj;
}

function buildProductPayload(body) {
  const title = (body.title || body.name || '').trim();
  const heroImage = (body.hero_image_url || body.image || '').trim();
  const category = (body.category || body.categories || '').toString().trim();
  const imageGallery = Array.isArray(body.imageGallery)
    ? body.imageGallery
    : (body.imageGallery || '')
        .toString()
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean);
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
    imageGallery: imageGallery.length ? imageGallery : undefined,
    tags,
    sku: body.sku || undefined,
    brand: body.brand || 'HexForge',
    stock: Number.isFinite(body.stock) ? body.stock : Number(body.stock) || 0,
    isFeatured: !!body.isFeatured,
  };
}

router.get('/', productLimiter, async (req, res) => {
  try {
    const { page = 1, limit = 20, featured, category, search, raw, status } = req.query;
    const conditions = [];

    if (featured === 'true') conditions.push({ isFeatured: true });
    if (category) conditions.push({ category });

    if (search) {
      const regex = { $regex: search, $options: 'i' };
      conditions.push({
        $or: [
          { title: regex },
          { description: regex },
          { name: regex },
        ],
      });
    }

    if (status && status !== 'all') {
      conditions.push({
        status: STATUS_VALUES.includes(String(status).toLowerCase())
          ? String(status).toLowerCase()
          : 'active',
      });
    } else if (!(req.session?.admin?.loggedIn && status === 'all')) {
      conditions.push({
        $or: [
          { status: 'active' },
          { status: { $exists: false } },
        ],
      });
    }

    const filter = conditions.length ? { $and: conditions } : {};

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    const response = products.map(toProductResponse);

    if (raw === 'true') {
      return res.json(response);
    }

    res.json({
      data: response,
      meta: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
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

router.get('/slug/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase().trim();
    if (!slug) return res.status(404).json({ error: 'Product not found' });
    const product = await Product.findOne({ slug });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const isAdmin = !!req.session?.admin?.loggedIn;
    if (!isAdmin && product.status && product.status !== 'active') {
      return res.status(404).json({ error: 'Product not available' });
    }

    res.json(toProductResponse(product));
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    const state = normalizeState(manifest.status || manifest.state || manifest.result?.status);

    if (state !== 'complete') {
      return res.status(400).json({
        error: 'Surface job is not complete',
        status: state,
      });
    }

    const derived = deriveAssets(manifest, jobId, subfolder);

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
    const statusValue = STATUS_VALUES.includes(requestedStatus) ? requestedStatus : 'draft';

    const product = await Product.create({
      title,
      description,
      price,
      status: statusValue,
      category,
      hero_image_url: derived.heroUrl,
      tags,
      sku: sku || undefined,
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

const PANEL_COUNT_MAP = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
  five: 5,
};

const PANEL_LABEL_MAP = {
  1: 'single',
  2: 'double',
  3: 'triple',
  4: 'quad',
  5: 'five',
};

const normalizeProductType = (value) => {
  const key = String(value || '').trim();
  const map = {
    multiPanelLampshade: 'panel',
    box: 'fixedBox4',
    boxModular: 'swappableBox5',
  };
  return map[key] || key || 'panel';
};

const clampPanelCount = (value, fallback, min = 1, max = 5) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.min(Math.max(numeric, min), max);
  }
  if (Number.isFinite(fallback)) {
    return Math.min(Math.max(fallback, min), max);
  }
  return null;
};

const getPanelsLabel = (count) => PANEL_LABEL_MAP[count] || 'single';

const getRequiredPanelCount = ({ productType, panels, panelCount }) => {
  if (productType === 'fixedBox4') return 4;
  if (productType === 'panelBox5' || productType === 'swappableBox5') return 5;
  if (productType === 'familyBundle4') return 4;
  if (productType === 'nightlight') return 1;

  const labelCount = PANEL_COUNT_MAP[String(panels || '').toLowerCase()] ?? null;
  const minPanels = productType === 'panel' || productType === 'cylinder' ? 2 : productType === 'globeLamp' ? 1 : 1;
  return clampPanelCount(panelCount, labelCount, minPanels, 5);
};

const SIZE_PRICE_MAP = {
  small: 0,
  medium: 10,
  large: 20,
};

const calculateCustomOrderPrice = ({ productType, panelCount, size = 'small', addons = {} }) => {
  let basePrice = 0;
  const sizeAdjustment = SIZE_PRICE_MAP[String(size).toLowerCase()] || 0;
  if (productType === 'cylinder') {
    const count = Math.max(2, Number(panelCount) || 2);
    basePrice = 35 + sizeAdjustment + Math.max(0, count - 2) * 10;
  } else if (productType === 'panel') {
    const count = Math.max(2, Number(panelCount) || 2);
    basePrice = 50 + sizeAdjustment + Math.max(0, count - 2) * 10;
  } else if (productType === 'globeLamp') {
    basePrice = 50 + sizeAdjustment;
  } else if (productType === 'fixedBox4') {
    basePrice = 45;
  } else if (productType === 'panelBox5' || productType === 'swappableBox5') {
    basePrice = 55;
  } else if (productType === 'familyBundle4') {
    basePrice = 129.99;
  } else if (productType === 'nightlight') {
    basePrice = 10;
  }

  let total = basePrice;
  if (addons.diffuser) total += 10;
  if (addons.nightlight) total += 5;
  return roundMoney(total);
};

const parseAddonsPayload = (value) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (err) {
      return {};
    }
  }
  if (typeof value === 'object') return value;
  return {};
};

// Validate promo code for custom lamp orders
router.post('/custom-orders/validate-promo', express.json(), async (req, res) => {
  try {
    const {
      productId,
      promoCode,
      productType,
      panels,
      panelCount,
      size,
      addons,
    } = req.body;

    if (!promoCode || !promoCode.trim()) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Find the promo code
    const promo = await PromoCode.findOne({
      code: promoCode.trim().toUpperCase(),
      isActive: true
    });

    if (!promo) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid or inactive promo code'
      });
    }

    // Check expiration
    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return res.status(400).json({
        valid: false,
        error: 'Promo code has expired'
      });
    }

    // Check usage limit
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      return res.status(400).json({
        valid: false,
        error: 'Promo code usage limit exceeded'
      });
    }

    // Get product to check restrictions
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }

    // Check category restrictions
    if (promo.allowedCategories && promo.allowedCategories.length > 0) {
      const hasAllowedCategory = promo.allowedCategories.some(cat =>
        product.category === cat || (product.categories && product.categories.includes(cat))
      );
      if (!hasAllowedCategory) {
        return res.status(400).json({
          valid: false,
          error: 'Promo code not valid for this product category'
        });
      }
    }

    // Check product restrictions
    if (promo.allowedProducts && promo.allowedProducts.length > 0) {
      if (!promo.allowedProducts.includes(productId)) {
        return res.status(400).json({
          valid: false,
          error: 'Promo code not valid for this product'
        });
      }
    }

    const resolvedProductType = normalizeProductType(productType);
    const requiredPanels = getRequiredPanelCount({
      productType: resolvedProductType,
      panels,
      panelCount,
    }) || 2;
    const resolvedAddons = parseAddonsPayload(addons);

    // Calculate discount preview with current custom order selections
    const originalPrice = calculateCustomOrderPrice({
      productType: resolvedProductType,
      panelCount: requiredPanels,
      size,
      addons: resolvedAddons,
    });
    let discountAmount = 0;

    if (promo.discountType === 'percentage') {
      discountAmount = Number((originalPrice * (promo.discountValue / 100)).toFixed(2));
    } else if (promo.discountType === 'fixed') {
      discountAmount = Math.min(promo.discountValue, originalPrice);
    }

    const discountedTotal = Math.max(0, originalPrice - discountAmount);
    const depositAmount = Number((discountedTotal * 0.5).toFixed(2));
    const remainingBalance = Number((discountedTotal - depositAmount).toFixed(2));

    res.json({
      valid: true,
      promoCode: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount,
      originalPrice,
      discountedTotal,
      depositAmount,
      remainingBalance,
      description: promo.description
    });

  } catch (err) {
    console.error('Promo validation error:', err);
    res.status(500).json({
      error: 'Failed to validate promo code',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Middleware to handle multer errors gracefully
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_UNEXPECTED_FILE'
      ? 'Too many image files uploaded. Maximum 5 files are allowed.'
      : err.code === 'LIMIT_FILE_SIZE'
      ? 'One or more image files exceed the 10MB size limit.'
      : err.message || 'Image upload failed.';
    return res.status(400).json({ error: message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Image upload failed.' });
  }
  next();
};

router.post(
  '/custom-orders',
  customOrderUpload.fields([
    { name: 'images[]', maxCount: 5 },
    { name: 'images', maxCount: 5 },
    { name: 'nightlightImage', maxCount: 1 },
  ]),
  handleMulterErrors,
  async (req, res) => {
    try {
      const {
        productId,
        productType,
        size,
        panels = 'single',
        panelCount,
        lightType,
        extras,
        addons,
        imageStyle,
        panelImages,
        extraPanelSet,
        lightingIncluded,
        notes,
        promoCode,
        customerName,
        customerEmail,
        customerPhone,
        shippingStreet,
        shippingCity,
        shippingState,
        shippingZip,
        shippingCountry,
      } = req.body;
      const idempotencyKey = getRequestIdempotencyKey(req, {
        customerEmail: customerEmail || '',
        customerName: customerName || '',
        productId: productId || '',
        productType: productType || '',
        panelCount: panelCount || '',
        size: size || '',
        lightType: lightType || '',
        promoCode: promoCode || '',
        shippingStreet: shippingStreet || '',
        shippingCity: shippingCity || '',
        shippingState: shippingState || '',
        shippingZip: shippingZip || '',
        shippingCountry: shippingCountry || '',
      });

      if (idempotencyKey) {
        const existingCustomOrder = await CustomOrder.findOne({ idempotencyKey });
        if (existingCustomOrder) {
          let checkoutUrl = null;
          if (existingCustomOrder.stripeSessionId) {
            try {
              const session = await stripe.checkout.sessions.retrieve(existingCustomOrder.stripeSessionId);
              checkoutUrl = session?.url || null;
            } catch (err) {
              console.warn('⚠️ Failed to retrieve existing custom order Stripe session:', err.message || err);
            }
          }

          return res.json({
            success: true,
            message: 'Custom order already exists',
            orderId: existingCustomOrder.orderId,
            productType: existingCustomOrder.productType || 'panel',
            panelCount: existingCustomOrder.panelCount,
            lightType: existingCustomOrder.lightType,
            extras: existingCustomOrder.extras,
            nightlightAddon: existingCustomOrder.nightlightAddon,
            boxOptions: existingCustomOrder.boxOptions,
            boxModularOptions: existingCustomOrder.boxModularOptions,
            cylinderOptions: existingCustomOrder.cylinderOptions,
            originalPrice: existingCustomOrder.originalPrice,
            discountedTotal: existingCustomOrder.discountedTotal,
            discountAmount: existingCustomOrder.discountAmount,
            promoCode: existingCustomOrder.promoCode || null,
            totalPrice: existingCustomOrder.totalPrice,
            depositAmount: existingCustomOrder.depositAmount,
            remainingBalance: existingCustomOrder.remainingBalance,
            checkoutUrl,
            sessionId: existingCustomOrder.stripeSessionId,
            status: existingCustomOrder.status,
            fulfillmentStatus: existingCustomOrder.fulfillmentStatus,
          });
        }
      }

      const parseExtras = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean);
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
          } catch (err) {
            return value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
          }
        }
        return [];
      };

      const parseBoolean = (value) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return false;
      };

      const parseStringArray = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean);
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
          } catch (err) {
            return value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
          }
        }
        return [];
      };

      const nightlightImageSource = req.body.nightlightImageSource;
      const nightlightSelectedMainImageIndex = req.body.nightlightSelectedMainImageIndex;
      const nightlightImageFiles = (req.files && req.files['nightlightImage']) || [];
      const nightlightImageFile = nightlightImageFiles[0] || null;

      const extrasPayload = extras ?? req.body['extras[]'];
      const addonsPayload = addons ?? req.body['addons'];
      const panelImagesPayload = panelImages ?? req.body['panelImages[]'];

      const resolvedProductType = normalizeProductType(productType);
      const requiredPanels = getRequiredPanelCount({
        productType: resolvedProductType,
        panels,
        panelCount,
      });
      if (requiredPanels === null) {
        return res.status(400).json({
          error: 'Invalid panel count. Valid values are 2 to 5 for lampshades.',
        });
      }

      const isGlobeLampOrder = resolvedProductType === 'globeLamp';
      const minImages = isGlobeLampOrder ? 1 : requiredPanels;
      const maxImages = isGlobeLampOrder ? 5 : requiredPanels;
      const resolvedPanelCount = clampPanelCount(panelCount, requiredPanels, 1, 5);
      const resolvedPanelsLabel = getPanelsLabel(requiredPanels);
      const resolvedLightType = lightType || 'led';
      const resolvedAddons = parseAddonsPayload(addonsPayload);
      const addonExtras = Object.entries(resolvedAddons)
        .filter(([key, value]) => value)
        .map(([key]) => key)
        .filter((key) => ['nightlight', 'diffuser', 'moonBackground'].includes(key));
      const allowedExtras = new Set(['nightlight', 'diffuser', 'moonBackground']);
      const legacyExtras = parseExtras(extrasPayload).filter((item) => allowedExtras.has(item));
      const resolvedExtras = Array.from(new Set([
        ...legacyExtras,
        ...addonExtras,
      ]));
      const resolvedExtraPanelSet = parseBoolean(extraPanelSet);
      const resolvedLightingIncluded = parseBoolean(req.body.lightingIncluded);
      const resolvedPanelImages = parseStringArray(panelImagesPayload);
      const uploadedFiles = ((req.files && req.files['images[]']) || []).concat((req.files && req.files['images']) || []).filter(Boolean);
      const mainUploadedFiles = uploadedFiles;

      if (resolvedProductType === 'fixedBox4' || resolvedProductType === 'panelBox5') {
        if (resolvedExtras.length > 0) {
          return res.status(400).json({
            error: 'Box orders do not support additional addons or nightlight options.',
          });
        }
      }

      const resolvedNightlightAddon = {
        imageSource: nightlightImageSource === 'separate_upload' ? 'separate_upload' : 'main_existing',
        selectedMainImageIndex: Number.isNaN(Number(nightlightSelectedMainImageIndex))
          ? undefined
          : Number(nightlightSelectedMainImageIndex),
        separateImage: nightlightImageFile ? {
          path: '',
          publicUrl: '',
          relativePath: '',
          originalName: nightlightImageFile.originalname,
          mimeType: nightlightImageFile.mimetype,
          size: nightlightImageFile.size,
          uploadedAt: new Date(),
        } : undefined,
      };

      if (resolvedProductType === 'fixedBox4' || resolvedProductType === 'panelBox5') {
        if (resolvedAddons.nightlight || nightlightImageFile) {
          return res.status(400).json({
            error: 'Box orders cannot include nightlight image options.',
          });
        }
      }

      if (resolvedAddons.nightlight) {
        if (resolvedNightlightAddon.imageSource === 'main_existing') {
          const index = resolvedNightlightAddon.selectedMainImageIndex;
          if (typeof index !== 'number' || index < 0 || index >= mainUploadedFiles.length || !mainUploadedFiles[index]) {
            return res.status(400).json({
              error: 'Please select a valid main uploaded image for the nightlight addon.',
            });
          }
        } else if (resolvedNightlightAddon.imageSource === 'separate_upload') {
          if (!nightlightImageFile) {
            return res.status(400).json({
              error: 'Please upload a separate image for the nightlight addon.',
            });
          }
        }
      }

      if (!productId) {
        return res.status(400).json({ error: 'Product ID is required for custom orders.' });
      }

      if (!customerName || !customerEmail || !customerPhone) {
        return res.status(400).json({
          error: 'Customer name, email, and phone are required for custom lamp orders.',
        });
      }

      if (!shippingStreet || !shippingCity || !shippingState || !shippingZip || !shippingCountry) {
        return res.status(400).json({
          error: 'Full shipping address is required for custom orders.',
        });
      }

      if (mainUploadedFiles.length < minImages) {
        return res.status(400).json({
          error: `No image files uploaded. ${minImages} image file${minImages === 1 ? '' : 's'} required${isGlobeLampOrder ? ' for globe lamp image upload' : ''}.`,
        });
      }
      if (uploadedFiles.length > maxImages) {
        return res.status(400).json({
          error: `Too many images uploaded. Expected ${maxImages} image file${maxImages === 1 ? '' : 's'}${isGlobeLampOrder ? ' for globe lamp image upload' : ` for ${resolvedPanelsLabel} panel(s)`}, but received ${uploadedFiles.length}.`,
        });
      }

      const orderFolder = getCustomOrderUploadDir(req.body?.orderId || 'pending');
      await ensureDir(orderFolder);

      const normalizeImageDestination = async (file, panel) => {
        const targetFolder = orderFolder;
        const targetName = path.basename(file.path);
        const targetPath = path.join(targetFolder, targetName);
        try {
          await fs.rename(file.path, targetPath);
        } catch (err) {
          // if rename fails, continue with original path stored as fallback
          console.warn('Failed to move custom order upload:', err.message || err);
        }
        const relativePath = getCustomOrderRelativePath(req.body?.orderId || 'pending', targetName);
        return {
          path: getCustomOrderPublicUrl(relativePath),
          publicUrl: getCustomOrderPublicUrl(relativePath),
          relativePath,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
          panel,
          panelLabel: `Panel ${panel}`,
        };
      };

      const allowedProductTypes = new Set(['panel', 'cylinder', 'globeLamp', 'fixedBox4', 'panelBox5', 'swappableBox5', 'familyBundle4', 'nightlight']);
      if (!allowedProductTypes.has(resolvedProductType)) {
        return res.status(400).json({
          error: 'Invalid product type for custom order.',
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(400).json({ error: 'Custom order product not found.' });
      }

      // Handle promo code validation and discount calculation
      let promoData = null;
      const originalPrice = calculateCustomOrderPrice({
        productType: resolvedProductType,
        panelCount: requiredPanels,
        size,
        addons: resolvedAddons,
      });
      let discountedTotal = originalPrice;
      let discountAmount = 0;
      let discountType = null;
      let discountValue = null;

      if (promoCode && promoCode.trim()) {
        try {
          // Validate promo code
          const promo = await PromoCode.findOne({
            code: promoCode.trim().toUpperCase(),
            isActive: true
          });

          if (!promo) {
            return res.status(400).json({
              error: 'Invalid or inactive promo code'
            });
          }

          // Check expiration
          if (promo.expiresAt && new Date() > promo.expiresAt) {
            return res.status(400).json({
              error: 'Promo code has expired'
            });
          }

          // Check usage limit
          if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
            return res.status(400).json({
              error: 'Promo code usage limit exceeded'
            });
          }

          // Check category restrictions
          if (promo.allowedCategories && promo.allowedCategories.length > 0) {
            const hasAllowedCategory = promo.allowedCategories.some(cat =>
              product.category === cat || (product.categories && product.categories.includes(cat))
            );
            if (!hasAllowedCategory) {
              return res.status(400).json({
                error: 'Promo code not valid for this product category'
              });
            }
          }

          // Check product restrictions
          if (promo.allowedProducts && promo.allowedProducts.length > 0) {
            if (!promo.allowedProducts.includes(productId)) {
              return res.status(400).json({
                error: 'Promo code not valid for this product'
              });
            }
          }

          // Check minimum order amount
          if (promo.minimumOrderAmount && originalPrice < promo.minimumOrderAmount) {
            return res.status(400).json({
              error: `Promo code requires minimum order of $${promo.minimumOrderAmount.toFixed(2)}`
            });
          }

          const promoResult = applyPromo(promo, originalPrice);
          discountAmount = promoResult.discountAmount;
          discountedTotal = promoResult.discountedTotal;

          // Store promo data
          promoData = {
            promoCode: promo.code,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            discountAmount,
            originalPrice,
            discountedTotal
          };

          discountType = promo.discountType;
          discountValue = promo.discountValue;

          // Increment usage count
          promo.usageCount += 1;
          await promo.save();

        } catch (promoErr) {
          console.error('Promo validation error:', promoErr);
          return res.status(400).json({
            error: 'Failed to validate promo code',
            details: process.env.NODE_ENV === 'development' ? promoErr.message : undefined
          });
        }
      }

      const depositAmount = calculateDeposit(discountedTotal);
      const remainingBalance = roundMoney(discountedTotal - depositAmount);

      const imageOrderMap = {};
      Object.keys(req.body).forEach((key) => {
        const match = key.match(/^imageOrder\[(\d+)\]$/);
        if (match) {
          const orderIndex = Number(match[1]);
          const panelNum = Number(req.body[key]);
          imageOrderMap[orderIndex] = panelNum;
        }
      });

      const orderId = uuidv4();
      const orderFolderPath = getCustomOrderUploadDir(orderId);
      await ensureDir(orderFolderPath);

      const images = await Promise.all(uploadedFiles.map(async (file, index) => {
        const panelNumber = imageOrderMap[index] !== undefined ? imageOrderMap[index] : index + 1;
        const filename = path.basename(file.path);
        const targetPath = path.join(orderFolderPath, filename);
        try {
          await fs.rename(file.path, targetPath);
        } catch (err) {
          console.warn('Failed to move custom order upload:', err.message || err);
        }
        const relativePath = getCustomOrderRelativePath(orderId, filename);
        return {
          path: getCustomOrderPublicUrl(relativePath),
          publicUrl: getCustomOrderPublicUrl(relativePath),
          relativePath,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
          panel: panelNumber,
          panelLabel: `Panel ${panelNumber}`,
        };
      }));

      if (resolvedNightlightAddon.separateImage && nightlightImageFile) {
        const nightlightFilename = path.basename(nightlightImageFile.path);
        const nightlightTargetPath = path.join(orderFolderPath, nightlightFilename);
        try {
          await fs.rename(nightlightImageFile.path, nightlightTargetPath);
        } catch (err) {
          console.warn('Failed to move nightlight image upload:', err.message || err);
        }
        const relativePath = getCustomOrderRelativePath(orderId, nightlightFilename);
        resolvedNightlightAddon.separateImage.path = getCustomOrderPublicUrl(relativePath);
        resolvedNightlightAddon.separateImage.publicUrl = getCustomOrderPublicUrl(relativePath);
        resolvedNightlightAddon.separateImage.relativePath = relativePath;
      }

      const panelNumbers = images.map((img) => img.panel);
      const expectedPanels = Array.from({ length: requiredPanels }, (_, idx) => idx + 1);
      if (JSON.stringify(panelNumbers) !== JSON.stringify(expectedPanels)) {
        return res.status(400).json({
          error: `Panel image order is invalid. Expected panels [${expectedPanels.join(', ')}] but got [${panelNumbers.join(', ')}].`,
        });
      }

      const customOrderDoc = new CustomOrder({
        orderId,
        idempotencyKey: idempotencyKey || undefined,
        productId,
        productName: product.title,
        productType: resolvedProductType,
        size: size || 'medium',
        panels: resolvedPanelsLabel,
        panelCount: requiredPanels,
        lightType: resolvedLightType,
        extras: resolvedExtras,
        notes: notes || '',
        boxOptions: resolvedProductType === 'fixedBox4' || resolvedProductType === 'panelBox5'
          ? {
            notes: notes || '',
          }
          : undefined,
        boxModularOptions: resolvedProductType === 'swappableBox5'
          ? {
            panelCount: requiredPanels,
            panelImages: resolvedPanelImages,
            extraPanelSet: resolvedExtraPanelSet,
            lightingIncluded: resolvedLightingIncluded,
            notes: notes || '',
          }
          : undefined,
        cylinderOptions: resolvedProductType === 'cylinder'
          ? {
            size: size || 'medium',
            imageStyle: imageStyle || 'wrap',
            lightType: resolvedLightType,
            extras: resolvedExtras,
            notes: notes || '',
          }
          : undefined,
        images,
        nightlightAddon: resolvedAddons.nightlight ? resolvedNightlightAddon : undefined,
        originalPrice,
        discountedTotal,
        discountAmount,
        discountType,
        discountValue,
        promoCode: promoData?.promoCode || null,
        totalPrice: discountedTotal,
        depositAmount,
        remainingBalance,
        paymentMethod: 'stripe',
        paymentStatus: 'pending',
        status: 'awaiting_deposit',
        fulfillmentStatus: 'awaiting_deposit',
        fulfillmentTimestamps: {
          awaitingDepositAt: new Date()
        },
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          shippingAddress: {
            street: shippingStreet,
            city: shippingCity,
            state: shippingState,
            zipCode: shippingZip,
            country: shippingCountry,
          },
        },
      });

      let savedOrder = null;
      let checkoutUrl = null;
      let sessionId = null;

      const uploadedFilesCount = uploadedFiles.length;
      console.info('Received custom order upload', {
        productId,
        productType: resolvedProductType,
        requiredPanels,
        uploadedFilesCount,
        minImages,
        maxImages,
      });

      if (process.env.STRIPE_SECRET_KEY) {
        try {
          console.info('Creating Stripe checkout session for custom order', {
            orderId: customOrderDoc.orderId,
            productId,
            productType: resolvedProductType,
            totalPrice: discountedTotal,
            depositAmount,
          });

          const baseUrl = getBaseUrl();
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: customerEmail,
            payment_intent_data: {
              metadata: {
                orderId: customOrderDoc.orderId,
                type: 'custom-order-deposit',
                promoCode: promoData?.promoCode || '',
                discountAmount: promoData?.discountAmount?.toString() || '0',
                idempotencyKey,
              },
            },
            line_items: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: `Deposit for ${product.title}${promoData ? ` (${promoData.promoCode})` : ''}`,
                    description: `50% deposit for custom lamp order ${customOrderDoc.orderId}${promoData ? ` - ${promoData.discountType === 'percentage' ? `${promoData.discountValue}% off` : `$${promoData.discountAmount} off`}` : ''}`,
                  },
                  unit_amount: Math.round(depositAmount * 100),
                },
                quantity: 1,
              },
            ],
            success_url: `${baseUrl}/custom-order-success?orderId=${encodeURIComponent(customOrderDoc.orderId)}&sessionId={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/store/${encodeURIComponent(product.slug)}`,
            metadata: {
              orderId: customOrderDoc.orderId,
              type: 'custom-order-deposit',
              promoCode: promoData?.promoCode || '',
              discountAmount: promoData?.discountAmount?.toString() || '0',
              idempotencyKey,
            },
          });

          console.info('Stripe checkout session created', {
            orderId: customOrderDoc.orderId,
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            amount: session.amount_total,
          });

          customOrderDoc.stripeSessionId = session.id;
          customOrderDoc.paymentIntentId = session.payment_intent || undefined;
          savedOrder = await customOrderDoc.save();
          checkoutUrl = session.url;
          sessionId = session.id;
        } catch (stripeErr) {
          console.error('Stripe session creation failed for custom order', {
            orderId: customOrderDoc.orderId,
            error: stripeErr.message || stripeErr,
          });
          return res.status(502).json({
            error: 'Payment service unavailable. Please try again later.',
          });
        }
      } else {
        savedOrder = await customOrderDoc.save();
      }

      console.info('Custom order saved', {
        orderId: savedOrder.orderId,
        productType: savedOrder.productType,
        panelCount: savedOrder.panelCount,
        totalPrice: savedOrder.totalPrice,
        checkoutUrl: Boolean(checkoutUrl),
      });

      try {
        const existingJob = await PrintJob.findOne({ orderId: savedOrder.orderId, isTest: { $ne: true } });
        if (existingJob) {
          console.info('[SOURCE PIPELINE] existing production job found while saving custom order', {
            printJobId: existingJob.printJobId,
            orderId: savedOrder.orderId,
          });
          const exportResult = await copyOrExportSourceImagesToSharedFolder({ printJob: existingJob, customOrder: savedOrder });
          if (exportResult.sharedSourceFolder) {
            existingJob.sharedSourceFolder = exportResult.sharedSourceFolder;
          }
          if (Array.isArray(exportResult.sourceImages) && exportResult.sourceImages.length) {
            existingJob.sourceImages = exportResult.sourceImages;
          }
          if (!Array.isArray(exportResult.sourceImages) || exportResult.sourceImages.length === 0) {
            console.info('[SOURCE PIPELINE] no source images exported for existing production job', {
              printJobId: existingJob.printJobId,
              orderId: savedOrder.orderId,
              sourceDir: exportResult.sharedSourceFolder,
            });
          }
          if (exportResult.sharedSourceFolder || (Array.isArray(exportResult.sourceImages) && exportResult.sourceImages.length)) {
            await existingJob.save();
          }
        }
      } catch (exportErr) {
        console.warn('⚠️ Failed to export source images for existing print job:', exportErr.message || exportErr);
      }

      await sendCustomOrderNotification(savedOrder).catch((emailErr) => {
        console.warn('⚠️ Custom order notification failed:', emailErr.message || emailErr);
      });
      await savedOrder.save();

      const responsePayload = {
        success: true,
        message: 'Custom order created successfully',
        orderId: savedOrder.orderId,
        productType: savedOrder.productType || 'panel',
        panelCount: savedOrder.panelCount,
        lightType: savedOrder.lightType,
        extras: savedOrder.extras,
        addons: {
          nightlight: savedOrder.extras?.includes('nightlight') || false,
          diffuser: savedOrder.extras?.includes('diffuser') || false,
          moonBackground: savedOrder.extras?.includes('moonBackground') || false,
        },
        nightlightAddon: savedOrder.extras?.includes('nightlight') ? savedOrder.nightlightAddon : undefined,
        boxOptions: savedOrder.productType === 'fixedBox4' || savedOrder.productType === 'panelBox5' ? savedOrder.boxOptions : undefined,
        boxModularOptions: savedOrder.productType === 'swappableBox5' ? savedOrder.boxModularOptions : undefined,
        cylinderOptions: savedOrder.productType === 'cylinder' ? savedOrder.cylinderOptions : undefined,
        originalPrice,
        discountedTotal,
        discountAmount,
        promoCode: promoData?.promoCode || null,
        totalPrice: discountedTotal,
        depositAmount,
        remainingBalance,
        checkoutUrl,
        sessionId,
        status: savedOrder.status,
        fulfillmentStatus: savedOrder.fulfillmentStatus,
      };

      return res.json(responsePayload);
    } catch (error) {
      console.error('Error processing custom order:', error.stack || error.message);
      return res.status(500).json({
        error: 'Failed to process custom order',
        details: process.env.NODE_ENV !== 'production' ? error.stack || error.message : undefined,
      });
    }
  }
);

// Public endpoint to lookup a custom lamp order by orderId
router.get('/custom-orders/:orderId', async (req, res) => {
  try {
    const customOrder = await CustomOrder.findOne({ orderId: req.params.orderId });
    if (!customOrder) {
      return res.status(404).json({ error: 'Custom order not found' });
    }
    const safeOrder = {
      orderId: customOrder.orderId,
      productId: customOrder.productId,
      productName: customOrder.productName,
      productType: customOrder.productType || 'panel',
      size: customOrder.size,
      panels: customOrder.panels,
      panelCount: customOrder.panelCount,
      lightType: customOrder.lightType,
      extras: customOrder.extras,
      addons: {
        nightlight: customOrder.extras?.includes('nightlight') || false,
        diffuser: customOrder.extras?.includes('diffuser') || false,
        moonBackground: customOrder.extras?.includes('moonBackground') || false,
      },
      nightlightAddon: customOrder.extras?.includes('nightlight') ? {
        ...customOrder.nightlightAddon,
        separateImage: customOrder.nightlightAddon?.separateImage
          ? {
              ...customOrder.nightlightAddon.separateImage,
              path: normalizeCustomOrderImagePath(customOrder.nightlightAddon.separateImage.path),
            }
          : undefined,
      } : undefined,
      boxOptions: customOrder.productType === 'fixedBox4' || customOrder.productType === 'panelBox5' ? customOrder.boxOptions : undefined,
      boxModularOptions: customOrder.productType === 'swappableBox5' ? customOrder.boxModularOptions : undefined,
      cylinderOptions: customOrder.productType === 'cylinder' ? customOrder.cylinderOptions : undefined,
      images: Array.isArray(customOrder.images)
        ? customOrder.images.map((img) => ({
            ...img,
            path: normalizeCustomOrderImagePath(img.path),
          }))
        : [],
      imagesCount: customOrder.images?.length || 0,
      totalPrice: customOrder.totalPrice,
      originalPrice: customOrder.originalPrice,
      discountedTotal: customOrder.discountedTotal,
      promoCode: customOrder.promoCode,
      discountType: customOrder.discountType,
      discountValue: customOrder.discountValue,
      discountAmount: customOrder.discountAmount,
      depositAmount: customOrder.depositAmount,
      remainingBalance: customOrder.remainingBalance,
      paymentStatus: customOrder.paymentStatus,
      status: customOrder.status,
      fulfillmentStatus: customOrder.fulfillmentStatus,
      trackingCarrier: customOrder.trackingCarrier,
      trackingNumber: customOrder.trackingNumber,
      trackingUrl: customOrder.trackingUrl,
      customer: {
        name: customOrder.customer?.name || '',
        email: customOrder.customer?.email || '',
        phone: customOrder.customer?.phone || '',
        shippingAddress: customOrder.customer?.shippingAddress || undefined,
      },
      createdAt: customOrder.createdAt,
      updatedAt: customOrder.updatedAt,
    };

    res.json(safeOrder);
  } catch (err) {
    console.error('❌ Failed to fetch custom order:', err);
    res.status(500).json({
      error: 'Failed to fetch custom order',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.post('/custom-orders/:orderId/confirm-deposit', express.json(), async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: 'Stripe is not configured for deposit confirmation.' });
    }

    const { sessionId, paymentIntentId } = req.body;
    const { orderId } = req.params;
    if (!sessionId && !paymentIntentId) {
      return res.status(400).json({ error: 'Stripe sessionId or paymentIntentId is required.' });
    }

    const customOrder = await CustomOrder.findOne({ orderId });
    if (!customOrder) {
      return res.status(404).json({ error: 'Custom order not found.' });
    }

    let session = null;
    if (sessionId) {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } else {
      const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
      session = sessions.data?.[0] || null;
    }

    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment is not complete yet.' });
    }

    if (String(session.metadata?.orderId || '') !== String(orderId)) {
      return res.status(400).json({ error: 'Stripe session does not belong to this custom order.' });
    }

    if (session.metadata?.type !== 'custom-order-deposit') {
      return res.status(400).json({ error: 'Stripe session is not a custom order deposit session.' });
    }

    customOrder.paymentStatus = 'deposit_paid';
    customOrder.status = 'deposit_paid';
    customOrder.fulfillmentStatus = 'deposit_paid';
    customOrder.stripeSessionId = session.id;
    customOrder.paymentIntentId = session.payment_intent || customOrder.paymentIntentId;
    customOrder.depositPaidAt = new Date();
    customOrder.fulfillmentTimestamps = customOrder.fulfillmentTimestamps || {};
    customOrder.fulfillmentTimestamps.depositPaidAt = new Date();
    await customOrder.save();

    await sendCustomOrderDepositConfirmation(customOrder);
    await customOrder.save();

    res.json({ success: true, customOrder });
  } catch (err) {
    console.error('❌ Failed to confirm deposit:', err);
    res.status(500).json({
      error: 'Failed to confirm deposit',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

module.exports = router;
