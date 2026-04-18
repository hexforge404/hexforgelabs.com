const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Product = require('../models/Product');
const Order = require('../models/Order');
const CustomOrder = require('../models/CustomOrder');
const PrintJob = require('../models/PrintJob');
const Batch = require('../models/Batch');
const PromoCode = require('../models/PromoCode');
const PromoAuditLog = require('../models/PromoAuditLog');
const StripeWebhookEvent = require('../models/StripeWebhookEvent');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const {
  normalizeCustomOrder,
  resolveCustomOrderImageDiskPath,
  isAllowedFulfillmentTransition,
  getFulfillmentTimestampKey,
  FULFILLMENT_STAGES,
} = require('../utils/customOrderUtils');

const STATUS_VALUES = ['draft', 'active', 'archived'];

const uploadsRoot = process.env.IMAGES_DIR || path.join(__dirname, '..', 'uploads');
const allowedImageTypes = /jpeg|jpg|png|webp|gif/;
const maxGalleryFiles = 30;
const adminUploadDir = path.join(uploadsRoot, 'admin');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(adminUploadDir);

const uploadStorage = multer.diskStorage({
  destination: adminUploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]+/gi, '-');
    const safeBase = base.replace(/(^-|-$)/g, '') || 'image';
    cb(null, `${safeBase}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extOk = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowedImageTypes.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only image files (jpg, png, webp, gif) are allowed.'));
  },
});

const sanitizeSlug = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);

const sanitizeBaseName = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);

const normalizeNamesField = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim());
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim());
  }
  return [];
};

const galleryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: maxGalleryFiles },
  fileFilter: (req, file, cb) => {
    const extOk = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowedImageTypes.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only image files (jpg, png, webp, gif) are allowed.'));
  },
});

// --- helper: require admin session ---
function requireAdmin(req, res, next) {
  if (req.session?.admin?.loggedIn) {
    return next();
  }
  console.warn('🚨 Unauthorized admin access attempt from IP:', req.ip);
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Admin login required'
  });
}

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

// 🔓 Session check endpoint (public – used by frontend to see if admin is logged in)
const setNoCacheHeaders = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  res.set('Vary', 'Origin');
};

// 🔓 Session check endpoint (public – used by frontend to see if admin is logged in)
router.get('/session', (req, res) => {
  console.log('🔐 Session check from IP:', req.ip);
  setNoCacheHeaders(res);
  res.status(200).json({
    loggedIn: !!req.session.admin?.loggedIn,
    isAdmin: !!req.session.admin?.loggedIn,
    user: req.session.admin?.username || null,
    admin: req.session.admin?.loggedIn
      ? {
          username: req.session.admin?.username || null,
          roles: req.session.admin?.roles || [],
        }
      : null,
  });
});

// ⛔ Everything below this line requires admin session
router.use(requireAdmin);
router.use(adminLimiter);

const hasAnyRole = (admin, allowedRoles) => {
  if (!admin?.loggedIn) return false;
  if (!Array.isArray(admin.roles) || admin.roles.length === 0) return true;
  return admin.roles.some((role) => allowedRoles.includes(role));
};

const requirePromoAdmin = (req, res, next) => {
  const allowedRoles = ['promotions', 'admin', 'superadmin'];
  if (hasAnyRole(req.session?.admin, allowedRoles)) {
    return next();
  }
  return res.status(403).json({
    error: 'Forbidden',
    message: 'Promo code management requires promotions role',
  });
};

// ⛔ Image upload is now admin-only
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ path: `/uploads/admin/${req.file.filename}` });
});

// ---- GALLERY MANAGER ----
router.get('/products/:id/gallery', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json({
      id: product._id,
      slug: product.slug,
      title: product.title,
      hero_image_url: product.hero_image_url || '',
      imageGallery: Array.isArray(product.imageGallery) ? product.imageGallery : [],
    });
  } catch (err) {
    console.error('❌ Failed to load product gallery:', err);
    res.status(400).json({
      error: 'Failed to load product gallery',
      details: err.message,
    });
  }
});

router.get('/products/slug/:slug/gallery', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json({
      id: product._id,
      slug: product.slug,
      title: product.title,
      hero_image_url: product.hero_image_url || '',
      imageGallery: Array.isArray(product.imageGallery) ? product.imageGallery : [],
    });
  } catch (err) {
    console.error('❌ Failed to load product gallery:', err);
    res.status(400).json({
      error: 'Failed to load product gallery',
      details: err.message,
    });
  }
});

router.post('/products/:id/gallery/upload', galleryUpload.array('images', maxGalleryFiles), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const slug = sanitizeSlug(product.slug || product.title || product.name);
    if (!slug) {
      return res.status(400).json({ error: 'Product slug is required for uploads' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const names = normalizeNamesField(req.body.names);
    const productDir = path.join(uploadsRoot, 'products', slug);
    fs.mkdirSync(productDir, { recursive: true });

    const files = req.files.map((file, index) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const desired = sanitizeBaseName(names[index] || path.basename(file.originalname, ext));
      const base = desired || `image-${Date.now()}-${index}`;
      let filename = `${base}${ext}`;
      let targetPath = path.join(productDir, filename);

      if (fs.existsSync(targetPath)) {
        filename = `${base}-${Date.now()}-${index}${ext}`;
        targetPath = path.join(productDir, filename);
      }

      fs.writeFileSync(targetPath, file.buffer);

      return {
        filename,
        url: `/uploads/products/${slug}/${filename}`,
        originalName: file.originalname,
      };
    });

    return res.json({
      productId: product._id,
      slug,
      files,
    });
  } catch (err) {
    console.error('❌ Failed to upload gallery images:', err);
    res.status(400).json({
      error: 'Failed to upload gallery images',
      details: err.message,
    });
  }
});

router.put('/products/:id/gallery', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const gallery = Array.isArray(req.body.imageGallery)
      ? req.body.imageGallery.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    let hero = String(req.body.hero_image_url || '').trim();

    if (gallery.length === 0) {
      hero = '';
    } else if (!hero || !gallery.includes(hero)) {
      hero = gallery[0] || '';
    }

    product.hero_image_url = hero;
    product.imageGallery = gallery;

    await product.save();

    return res.json({
      id: product._id,
      slug: product.slug,
      title: product.title,
      hero_image_url: product.hero_image_url || '',
      imageGallery: Array.isArray(product.imageGallery) ? product.imageGallery : [],
    });
  } catch (err) {
    console.error('❌ Failed to update product gallery:', err);
    res.status(400).json({
      error: 'Failed to update product gallery',
      details: err.message,
    });
  }
});

// Product validation rules
const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0.01 }).withMessage('Valid price required'),
  body('description').optional().trim().escape(),
  body('stock').optional().isInt({ min: 0 }),
  body('images').optional().isArray(),
  body('imageGallery').optional().isArray(),
];

const validatePromoCreate = [
  body('code').trim().notEmpty().withMessage('Promo code is required'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be 0 or greater'),
  body('description').optional().isString(),
  body('isActive').optional().isBoolean(),
  body('usageLimit').optional().isInt({ min: 1 }),
  body('minimumOrderAmount').optional().isFloat({ min: 0 }),
  body('allowedCategories').optional(),
  body('allowedProducts').optional(),
  body('expiresAt').optional(),
];

const validatePromoUpdate = [
  body('code').optional().trim().notEmpty(),
  body('discountType').optional().isIn(['percentage', 'fixed']),
  body('discountValue').optional().isFloat({ min: 0 }),
  body('description').optional().isString(),
  body('isActive').optional().isBoolean(),
  body('usageLimit').optional().isInt({ min: 1 }),
  body('minimumOrderAmount').optional().isFloat({ min: 0 }),
  body('allowedCategories').optional(),
  body('allowedProducts').optional(),
  body('expiresAt').optional(),
];

const normalizePromoList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const buildPromoPayload = (body, adminUser) => {
  const payload = {};

  if (body.code !== undefined) payload.code = String(body.code).trim().toUpperCase();
  if (body.description !== undefined) payload.description = String(body.description).trim();
  if (body.discountType !== undefined) payload.discountType = body.discountType;
  if (body.discountValue !== undefined) payload.discountValue = Number(body.discountValue);
  if (body.isActive !== undefined) payload.isActive = !!body.isActive;
  if (body.usageCount !== undefined && body.usageCount !== '') payload.usageCount = Number(body.usageCount);
  if (body.usageLimit !== undefined && body.usageLimit !== '') payload.usageLimit = Number(body.usageLimit);
  if (body.minimumOrderAmount !== undefined && body.minimumOrderAmount !== '') {
    payload.minimumOrderAmount = Number(body.minimumOrderAmount);
  }
  if (body.allowedCategories !== undefined) payload.allowedCategories = normalizePromoList(body.allowedCategories);
  if (body.allowedProducts !== undefined) payload.allowedProducts = normalizePromoList(body.allowedProducts);
  if (body.expiresAt !== undefined) {
    payload.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  }
  if (adminUser) payload.updatedBy = adminUser;

  return payload;
};

const buildPromoSnapshot = (promo) => {
  if (!promo) return null;
  const obj = promo.toObject ? promo.toObject() : promo;
  return {
    code: obj.code,
    description: obj.description,
    discountType: obj.discountType,
    discountValue: obj.discountValue,
    isActive: obj.isActive,
    usageLimit: obj.usageLimit,
    usageCount: obj.usageCount,
    minimumOrderAmount: obj.minimumOrderAmount,
    allowedCategories: obj.allowedCategories,
    allowedProducts: obj.allowedProducts,
    expiresAt: obj.expiresAt,
  };
};

const getAuditActor = (req) => {
  const roles = req.session?.admin?.roles || [];
  return {
    username: req.session?.admin?.username || 'unknown',
    role: roles[0] || 'admin',
  };
};

const safeAuditLog = async ({ req, action, promoCode, before, after, metadata }) => {
  try {
    await PromoAuditLog.create({
      action,
      promoCode,
      actor: getAuditActor(req),
      before,
      after,
      metadata: {
        ...metadata,
        sourceIp: req.ip,
      },
    });
  } catch (err) {
    console.warn('⚠️ Failed to write promo audit log:', err.message || err);
  }
};

// GET all products
function mapProduct(product) {
  const obj = product.toObject({ virtuals: true });
  obj.name = obj.name || obj.title;
  obj.image = obj.image || obj.hero_image_url;
  obj.priceFormatted = obj.priceFormatted || (typeof obj.price === 'number' ? `$${obj.price.toFixed(2)}` : '$0.00');
  return obj;
}

router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ created_at: -1 });
    res.json(products.map(mapProduct));
  } catch (err) {
    console.error('❌ Failed to fetch products:', err);
    res.status(500).json({
      error: 'Failed to fetch products',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST new product
router.post('/products', validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    console.log('📥 New product from admin:', req.session.admin.username);
    const product = new Product({
      ...req.body,
      createdBy: req.session.admin.username
    });

    await product.save();

    console.log('✅ Product created:', product._id);
    res.status(201).json(product);
  } catch (err) {
    console.error('❌ Product creation failed:', err);
    res.status(400).json({
      error: 'Product creation failed',
      details: err.message
    });
  }
});

// UPDATE product
router.put('/products/:id', validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    console.log(`🔄 Product update for ID: ${req.params.id} by admin: ${req.session.admin.username}`);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: new Date(),
        updatedBy: req.session.admin.username
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('✅ Product updated:', product._id);
    res.json(product);
  } catch (err) {
    console.error('❌ Failed to update product', err);
    res.status(400).json({
      error: 'Failed to update product',
      details: err.message
    });
  }
});

// PATCH product (status + metadata)
router.patch('/products/:id', async (req, res) => {
  try {
    const update = {};
    if (req.body.title || req.body.name) update.title = (req.body.title || req.body.name || '').trim();
    if (req.body.description) update.description = req.body.description;
    if (req.body.category) update.category = req.body.category;
    if (req.body.hero_image_url || req.body.image) update.hero_image_url = req.body.hero_image_url || req.body.image;
    if (req.body.tags) {
      update.tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : String(req.body.tags)
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
    }
    if (req.body.price !== undefined) update.price = Number(req.body.price);

    if (req.body.status) {
      const desired = String(req.body.status).toLowerCase();
      if (!STATUS_VALUES.includes(desired)) {
        return res.status(400).json({ error: `Invalid status. Use one of: ${STATUS_VALUES.join(', ')}` });
      }
      update.status = desired;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...update,
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(mapProduct(product));
  } catch (err) {
    console.error('❌ Failed to patch product', err);
    res.status(400).json({
      error: 'Failed to update product',
      details: err.message,
    });
  }
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
  try {
    console.log(`🗑️ Delete product ID: ${req.params.id} by admin: ${req.session.admin.username}`);

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('✅ Product deleted:', product._id);
    res.json({
      message: 'Product deleted successfully',
      deletedProduct: product._id
    });
  } catch (err) {
    console.error('❌ Failed to delete product', err);
    res.status(500).json({
      error: 'Failed to delete product',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET all orders with filtering
router.get('/orders', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const filter = status ? { status } : {};

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(orders);
  } catch (err) {
    console.error('❌ Failed to fetch orders:', err);
    res.status(500).json({
      error: 'Failed to fetch orders',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

router.get('/webhook-events', async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    const filter = {};

    if (status) filter.status = status;

    const [events, total] = await Promise.all([
      StripeWebhookEvent.find(filter)
        .sort({ receivedAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit)),
      StripeWebhookEvent.countDocuments(filter),
    ]);

    res.json({
      data: events.map((event) => ({
        eventId: event.stripeEventId,
        type: event.type,
        status: event.status,
        orderId: event.orderId || event.customOrderId || null,
        timestamp: event.receivedAt,
        errorMessage: event.errorMessage || null,
        resultMessage: event.resultMessage || null,
      })),
      pagination: {
        total,
        offset: Number(offset),
        limit: Number(limit),
        hasMore: Number(offset) + Number(limit) < total,
      },
    });
  } catch (err) {
    console.error('❌ Failed to fetch webhook events:', err);
    res.status(500).json({
      error: 'Failed to fetch webhook events',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.get('/orders/payment-status', async (req, res) => {
  try {
    const { type = 'standard', limit = 50, offset = 0 } = req.query;
    const pendingThresholdMinutes = Number(process.env.PAYMENT_PENDING_THRESHOLD_MINUTES || 30);
    const thresholdDate = new Date(Date.now() - pendingThresholdMinutes * 60 * 1000);

    const includeStandard = type !== 'custom';
    const includeCustom = type !== 'standard';

    const [orders, customOrders] = await Promise.all([
      includeStandard
        ? Order.find({})
            .sort({ createdAt: -1 })
            .skip(Number(offset))
            .limit(Number(limit))
        : [],
      includeCustom
        ? CustomOrder.find({})
            .sort({ createdAt: -1 })
            .skip(Number(offset))
            .limit(Number(limit))
        : [],
    ]);

    const items = [];

    const buildItem = async (doc, orderType) => {
      const orderId = doc.orderId;
      const stripeSessionId = doc.stripeSessionId || null;
      const paymentIntentId = doc.paymentIntentId || null;
      const payments = [];
      let stripeStatus = null;
      let lastCheckedAt = null;
      let mismatched = false;
      const attentionReasons = [];

      if (!stripeSessionId && !paymentIntentId) {
        attentionReasons.push('missing_stripe_linkage');
      }

      if (stripe && (stripeSessionId || paymentIntentId)) {
        try {
          let session = null;
          let paymentIntent = null;

          if (stripeSessionId) {
            session = await stripe.checkout.sessions.retrieve(stripeSessionId, { expand: ['payment_intent'] });
          }
          if (!paymentIntent && session?.payment_intent) {
            paymentIntent = session.payment_intent;
          }
          if (!paymentIntent && paymentIntentId) {
            paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          }

          stripeStatus = session?.payment_status || paymentIntent?.status || null;
          lastCheckedAt = new Date();

          const paidOnStripe = ['paid', 'succeeded'].includes(String(stripeStatus || '').toLowerCase());
          const paidInDb = ['paid', 'completed', 'deposit_paid', 'paid_in_full'].includes(String(doc.paymentStatus || '').toLowerCase());
          if (paidOnStripe !== paidInDb) {
            mismatched = true;
            attentionReasons.push('stripe_db_payment_mismatch');
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch Stripe payment status for admin payment audit:', err.message || err);
          attentionReasons.push('stripe_status_unavailable');
        }
      }

      if (doc.createdAt && String(doc.paymentStatus).toLowerCase() === 'pending' && doc.createdAt < thresholdDate) {
        attentionReasons.push('pending_payment_delay');
      }

      const duplicateCount = await StripeWebhookEvent.countDocuments({
        orderId: orderId,
        paymentIntentId,
      });
      if (duplicateCount > 1) {
        attentionReasons.push('duplicate_webhook_attempts');
      }

      return {
        orderId,
        orderType,
        paymentStatus: doc.paymentStatus,
        stripeSessionId,
        paymentIntentId,
        lastCheckedAt,
        mismatch: mismatched,
        requiresAttention: attentionReasons.length > 0,
        attentionReasons,
        stripeStatus,
      };
    };

    const resultItems = [];
    for (const order of orders) {
      resultItems.push(await buildItem(order, 'standard'));
    }
    for (const customOrder of customOrders) {
      resultItems.push(await buildItem(customOrder, 'custom'));
    }

    res.json({
      data: resultItems,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: resultItems.length === Number(limit),
      },
    });
  } catch (err) {
    console.error('❌ Failed to fetch payment status audit:', err);
    res.status(500).json({
      error: 'Failed to fetch payment status audit',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.get('/monitoring/summary', async (req, res) => {
  try {
    const pendingThresholdMinutes = Number(process.env.PAYMENT_PENDING_THRESHOLD_MINUTES || 30);
    const thresholdDate = new Date(Date.now() - pendingThresholdMinutes * 60 * 1000);

    const [totalWebhooks, processedWebhooks, failedWebhooks, ignoredWebhooks, recentFailed, standardPendingAged, customPendingAged, standardMissingLinkage, customMissingLinkage, duplicatePaymentIntents] = await Promise.all([
      StripeWebhookEvent.countDocuments(),
      StripeWebhookEvent.countDocuments({ status: 'processed' }),
      StripeWebhookEvent.countDocuments({ status: 'failed' }),
      StripeWebhookEvent.countDocuments({ status: 'ignored' }),
      StripeWebhookEvent.find({ status: 'failed' })
        .sort({ receivedAt: -1 })
        .limit(5)
        .select('stripeEventId type orderId customOrderId receivedAt errorMessage resultMessage paymentIntentId stripeSessionId'),
      Order.countDocuments({ paymentStatus: 'pending', createdAt: { $lt: thresholdDate } }),
      CustomOrder.countDocuments({ paymentStatus: 'pending', createdAt: { $lt: thresholdDate } }),
      Order.countDocuments({ $and: [{ stripeSessionId: { $in: [null, ''] } }, { paymentIntentId: { $in: [null, ''] } }] }),
      CustomOrder.countDocuments({ $and: [{ stripeSessionId: { $in: [null, ''] } }, { paymentIntentId: { $in: [null, ''] } }] }),
      StripeWebhookEvent.aggregate([
        { $match: { paymentIntentId: { $exists: true, $ne: null } } },
        { $group: { _id: '$paymentIntentId', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'duplicateCount' },
      ]),
    ]);

    const duplicateCount = Array.isArray(duplicatePaymentIntents) && duplicatePaymentIntents[0]
      ? duplicatePaymentIntents[0].duplicateCount
      : 0;

    res.json({
      summary: {
        totalWebhooks,
        processedWebhooks,
        failedWebhooks,
        ignoredWebhooks,
        duplicatePaymentIntentEvents: duplicateCount,
        standardPendingAgedOrders: standardPendingAged,
        customPendingAgedOrders: customPendingAged,
        standardMissingStripeLinkage: standardMissingLinkage,
        customMissingStripeLinkage: customMissingLinkage,
        recentFailedEvents: recentFailed.map((event) => ({
          eventId: event.stripeEventId,
          type: event.type,
          orderId: event.orderId || event.customOrderId || null,
          timestamp: event.receivedAt,
          errorMessage: event.errorMessage || event.resultMessage || null,
          paymentIntentId: event.paymentIntentId || null,
          stripeSessionId: event.stripeSessionId || null,
        })),
        thresholdMinutes: pendingThresholdMinutes,
      },
    });
  } catch (err) {
    console.error('❌ Failed to fetch monitoring summary:', err);
    res.status(500).json({
      error: 'Failed to fetch monitoring summary',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// GET all custom lamp orders with filtering
router.get('/custom-orders', async (req, res) => {
  try {
    const { status, panels, limit = 100, offset = 0 } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (panels) filter.panels = panels;

    const customOrders = await CustomOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await CustomOrder.countDocuments(filter);

    res.json({
      data: customOrders.map(normalizeCustomOrder),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });
  } catch (err) {
    console.error('❌ Failed to fetch custom orders:', err);
    res.status(500).json({
      error: 'Failed to fetch custom orders',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Download all custom order images as a ZIP archive
router.get('/custom-orders/:orderId/images.zip', requireAdmin, async (req, res) => {
  try {
    const customOrder = await CustomOrder.findOne({ orderId: req.params.orderId });
    if (!customOrder) {
      return res.status(404).json({ error: 'Custom order not found' });
    }

    const images = Array.isArray(customOrder.images) ? customOrder.images.filter(Boolean) : [];
    if (images.length === 0) {
      return res.status(400).json({ error: 'No uploaded images available for this order.' });
    }

    const zipFilename = `custom-order-${customOrder.orderId}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('❌ ZIP archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create ZIP archive' });
      } else {
        res.end();
      }
    });

    archive.pipe(res);

    for (let index = 0; index < images.length; index += 1) {
      const img = images[index];
      const diskPath = resolveCustomOrderImageDiskPath(img);
      if (!diskPath) {
        archive.append(`Missing file: ${img.originalName || `image-${index + 1}`}` , { name: `missing-${index + 1}.txt` });
        continue;
      }
      try {
        if (fs.existsSync(diskPath)) {
          const entryName = img.originalName || path.basename(diskPath) || `image-${index + 1}`;
          archive.file(diskPath, { name: entryName });
        } else {
          archive.append(`Missing file: ${img.originalName || path.basename(diskPath) || 'unknown'}`, {
            name: `missing-${index + 1}.txt`
          });
        }
      } catch (zipErr) {
        console.warn('⚠️ Skipping missing image for ZIP:', zipErr.message || zipErr);
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('❌ Failed to stream images ZIP:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to create ZIP archive',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
});

// GET single custom order by ID
router.get('/custom-orders/:orderId', async (req, res) => {
  try {
    const customOrder = await CustomOrder.findOne({ orderId: req.params.orderId });
    
    if (!customOrder) {
      return res.status(404).json({ error: 'Custom order not found' });
    }

    res.json(normalizeCustomOrder(customOrder));
  } catch (err) {
    console.error('❌ Failed to fetch custom order:', err);
    res.status(500).json({
      error: 'Failed to fetch custom order',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

const getPrintJobDefaults = (productType) => {
  const normalized = String(productType || '').toLowerCase();
  const defaults = {
    printerProfile: 'Cura Default Profile',
    materialProfile: 'PLA Standard',
    slicerProfile: 'Ultimaker Cura',
    nozzle: '0.4mm',
    layerHeight: 0.2,
    infill: 20,
    wallCount: 2,
    estimatedPrintHours: 4,
  };

  if (normalized.includes('cylinder')) {
    return {
      ...defaults,
      printerProfile: 'Prusa MK3S+ / Cylinder',
      slicerProfile: 'PrusaSlicer',
      layerHeight: 0.18,
      infill: 15,
      wallCount: 2,
      estimatedPrintHours: 8,
    };
  }

  if (normalized.includes('globe')) {
    return {
      ...defaults,
      printerProfile: 'Anycubic Photon',
      slicerProfile: 'Lychee Slicer',
      layerHeight: 0.05,
      infill: 10,
      wallCount: 1,
      estimatedPrintHours: 12,
    };
  }

  if (normalized.includes('box') || normalized.includes('panel')) {
    return {
      ...defaults,
      printerProfile: 'Prusa MK4',
      slicerProfile: 'PrusaSlicer',
      layerHeight: 0.2,
      infill: 15,
      wallCount: 2,
      estimatedPrintHours: 6,
    };
  }

  return defaults;
};

const normalizePrintJobPayload = (rawJob) => {
  if (!rawJob) return rawJob;
  const job = rawJob.toObject ? rawJob.toObject({ getters: true, virtuals: false }) : { ...rawJob };
  return job;
};

const normalizeCompatProfile = (value) => String(value || '').trim().toLowerCase();

const isSlicerProfileCompatible = (candidate, existing) => {
  const a = normalizeCompatProfile(candidate);
  const b = normalizeCompatProfile(existing);
  if (!a || !b) return true;
  return a === b || a.includes(b) || b.includes(a);
};

const isPrintJobCompatibleWithBatch = (job, batch) => {
  if (!batch) return false;
  return (
    normalizeCompatProfile(job.printerProfile) === normalizeCompatProfile(batch.printerProfile) &&
    normalizeCompatProfile(job.materialProfile) === normalizeCompatProfile(batch.materialProfile) &&
    normalizeCompatProfile(job.nozzle) === normalizeCompatProfile(batch.nozzle) &&
    Number(job.layerHeight) === Number(batch.layerHeight) &&
    isSlicerProfileCompatible(job.slicerProfile, batch.slicerProfile)
  );
};

const computeBatchTotals = async (printJobIds) => {
  if (!Array.isArray(printJobIds) || !printJobIds.length) return 0;
  const jobs = await PrintJob.find({ printJobId: { $in: printJobIds } });
  return jobs.reduce((sum, job) => sum + Number(job.estimatedPrintHours || 0), 0);
};

const sanitizeFilename = (value) => {
  if (!value) return 'file';
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180) || 'file';
};

const buildWorkOrderHtml = (order, printJob) => {
  const shipping = order.customer?.shippingAddress
    ? `${order.customer.shippingAddress.street}, ${order.customer.shippingAddress.city}, ${order.customer.shippingAddress.state} ${order.customer.shippingAddress.zipCode}, ${order.customer.shippingAddress.country}`
    : 'Not provided';
  const imagesCount = Array.isArray(order.images) ? order.images.length : order.imagesCount || 0;
  const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Work Order ${order.orderId}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0a; color: #eceff4; padding: 24px; }
    h1, h2 { color: #00ffc8; }
    .section { margin-bottom: 20px; padding: 16px; border: 1px solid #222; border-radius: 10px; background: #10131a; }
    .section dt { font-weight: bold; margin-top: 8px; }
    .section dd { margin: 4px 0 10px 0; }
    .metadata { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
  </style>
</head>
<body>
  <h1>Work Order ${order.orderId}</h1>
  <div class="section">
    <h2>Customer</h2>
    <dl class="metadata">
      <dt>Name</dt><dd>${order.customer?.name || 'Unknown'}</dd>
      <dt>Email</dt><dd>${order.customer?.email || 'Unknown'}</dd>
      <dt>Phone</dt><dd>${order.customer?.phone || 'Unknown'}</dd>
      <dt>Shipping</dt><dd>${shipping}</dd>
    </dl>
  </div>
  <div class="section">
    <h2>Order Details</h2>
    <dl class="metadata">
      <dt>Product</dt><dd>${order.productName || 'Unknown'}</dd>
      <dt>Type</dt><dd>${order.productType || 'Unknown'}</dd>
      <dt>Panels</dt><dd>${order.panels || 'N/A'}</dd>
      <dt>Images</dt><dd>${imagesCount}</dd>
      <dt>Payment</dt><dd>${order.paymentStatus || 'pending'}</dd>
      <dt>Fulfillment</dt><dd>${order.fulfillmentStatus || order.status || 'submitted'}</dd>
      <dt>Created</dt><dd>${createdAt}</dd>
    </dl>
  </div>
  <div class="section">
    <h2>Print Job</h2>
    <dl class="metadata">
      <dt>Print Job</dt><dd>${printJob.printJobId}</dd>
      <dt>Status</dt><dd>${printJob.status}</dd>
      <dt>Printer</dt><dd>${printJob.printerProfile || 'TBD'}</dd>
      <dt>Material</dt><dd>${printJob.materialProfile || 'TBD'}</dd>
      <dt>Slicer</dt><dd>${printJob.slicerProfile || 'TBD'}</dd>
      <dt>Nozzle</dt><dd>${printJob.nozzle || 'TBD'}</dd>
      <dt>Layer Height</dt><dd>${printJob.layerHeight || 'TBD'}</dd>
      <dt>Generation Method</dt><dd>${printJob.generationMethod || 'Manual'}</dd>
      <dt>Lithophane Type</dt><dd>${printJob.lithophaneType || 'Custom'}</dd>
      <dt>Target Width</dt><dd>${printJob.targetWidthMm || 'N/A'} mm</dd>
      <dt>Target Height</dt><dd>${printJob.targetHeightMm || 'N/A'} mm</dd>
      <dt>Target Depth</dt><dd>${printJob.targetDepthMm || 'N/A'} mm</dd>
      <dt>Panel Count</dt><dd>${printJob.panelCount || 1}</dd>
      <dt>STL Filename</dt><dd>${printJob.stlFilename || 'Not set'}</dd>
      <dt>STL Path</dt><dd>${printJob.stlPath || 'Not set'}</dd>
      <dt>STL Version</dt><dd>${printJob.stlVersion || 'Not set'}</dd>
      <dt>Infill</dt><dd>${printJob.infill || 'TBD'}%</dd>
      <dt>Walls</dt><dd>${printJob.wallCount || 'TBD'}</dd>
      <dt>Estimated Hours</dt><dd>${printJob.estimatedPrintHours || 0}</dd>
    </dl>
  </div>
  <div class="section">
    <h2>Notes</h2>
    <pre style="white-space: pre-wrap; color: #d1dbe3;">${(printJob.notes || 'No notes').replace(/</g, '&lt;')}</pre>
  </div>
</body>
</html>`;
};

// CREATE a print job from a custom order
router.post('/print-jobs', async (req, res) => {
  try {
    const {
      orderId,
      customOrderId,
      printerProfile,
      materialProfile,
      slicerProfile,
      nozzle,
      layerHeight,
      infill,
      wallCount,
      generationMethod,
      lithophaneType,
      targetWidthMm,
      targetHeightMm,
      targetDepthMm,
      panelCount,
      generationNotes,
      status,
      assignedBatchId,
      stlFilename,
      stlPath,
      stlVersion,
      projectFilePath,
      gcodePath,
      estimatedPrintHours,
      notes,
      partType,
    } = req.body;

    if (!orderId && !customOrderId) {
      return res.status(400).json({ error: 'orderId or customOrderId is required to create a print job.' });
    }

    let customOrder;
    if (orderId) {
      customOrder = await CustomOrder.findOne({ orderId });
    }
    if (!customOrder && customOrderId) {
      customOrder = await CustomOrder.findOne({ _id: customOrderId });
    }
    if (!customOrder) {
      return res.status(404).json({ error: 'Custom order not found.' });
    }

    const normalizedOrder = normalizeCustomOrder(customOrder);
    const suggested = getPrintJobDefaults(normalizedOrder.productType);

    const sourceImages = Array.isArray(normalizedOrder.images)
      ? normalizedOrder.images.map((img) => ({
          path: img.path || '',
          publicUrl: img.publicUrl || '',
          relativePath: img.relativePath || '',
          originalName: img.originalName || '',
          mimeType: img.mimeType || '',
          size: img.size || 0,
        }))
      : [];

    const printJob = await PrintJob.create({
      orderId: normalizedOrder.orderId,
      customOrderId: customOrderId || normalizedOrder._id || normalizedOrder.orderId,
      productType: normalizedOrder.productType || 'panel',
      partType: partType || normalizedOrder.productType || 'custom_order',
      sourceImages,
      printerProfile: printerProfile || suggested.printerProfile,
      materialProfile: materialProfile || suggested.materialProfile,
      slicerProfile: slicerProfile || suggested.slicerProfile,
      nozzle: nozzle || suggested.nozzle,
      layerHeight: typeof layerHeight === 'number' ? layerHeight : suggested.layerHeight,
      infill: typeof infill === 'number' ? infill : suggested.infill,
      wallCount: typeof wallCount === 'number' ? wallCount : suggested.wallCount,
      generationMethod: generationMethod || '',
      lithophaneType: lithophaneType || '',
      targetWidthMm: typeof targetWidthMm === 'number' ? targetWidthMm : 0,
      targetHeightMm: typeof targetHeightMm === 'number' ? targetHeightMm : 0,
      targetDepthMm: typeof targetDepthMm === 'number' ? targetDepthMm : 0,
      panelCount: typeof panelCount === 'number' ? panelCount : 1,
      generationNotes: generationNotes || '',
      status: status || 'queued_for_generation',
      assignedBatchId: assignedBatchId || '',
      stlFilename: stlFilename || '',
      stlPath: stlPath || '',
      stlVersion: stlVersion || '',
      projectFilePath: projectFilePath || '',
      gcodePath: gcodePath || '',
      estimatedPrintHours: typeof estimatedPrintHours === 'number' ? estimatedPrintHours : suggested.estimatedPrintHours,
      notes: notes || '',
    });

    res.status(201).json(normalizePrintJobPayload(printJob));
  } catch (err) {
    console.error('❌ Failed to create print job:', err);
    res.status(500).json({
      error: 'Failed to create print job',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// GET print jobs
router.get('/print-jobs', async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    if (typeof status === 'string' && status.includes(',')) {
      const statusList = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statusList.length) {
        filter.status = { $in: statusList };
      }
    }

    const jobs = await PrintJob.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await PrintJob.countDocuments(filter);

    res.json({
      data: jobs.map(normalizePrintJobPayload),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
      }
    });
  } catch (err) {
    console.error('❌ Failed to fetch print jobs:', err);
    res.status(500).json({
      error: 'Failed to fetch print jobs',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// PATCH print job fields/status
router.get('/print-jobs/:printJobId/slicer-packet.zip', async (req, res) => {
  try {
    const { printJobId } = req.params;
    const printJob = await PrintJob.findOne({ printJobId });
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found.' });
    }

    const customOrder = await CustomOrder.findOne({ orderId: printJob.orderId });
    if (!customOrder) {
      return res.status(404).json({ error: 'Linked custom order not found.' });
    }

    const normalizedOrder = normalizeCustomOrder(customOrder);
    const jobPayload = normalizePrintJobPayload(printJob);
    const orderPayload = {
      ...normalizedOrder,
      sourceImages: normalizedOrder.images,
    };

    const zipFilename = `slicer-packet-${sanitizeFilename(printJob.printJobId)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('❌ Slicer packet archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create slicer packet' });
      } else {
        res.end();
      }
    });

    archive.pipe(res);

    archive.append(JSON.stringify(orderPayload, null, 2), { name: 'order.json' });
    archive.append(JSON.stringify(jobPayload, null, 2), { name: 'print-job.json' });
    archive.append(buildWorkOrderHtml(normalizedOrder, jobPayload), { name: 'work-order.html' });

    const notesText = [];
    notesText.push(`Custom Order Notes:\n${normalizedOrder.notes || 'None'}`);
    notesText.push('');
    notesText.push(`Print Job Notes:\n${jobPayload.notes || 'None'}`);
    archive.append(notesText.join('\n'), { name: 'slicer-notes.txt' });

    const outputName = `slicer-packet-${sanitizeFilename(printJob.printJobId)}`;
    archive.append(outputName, { name: 'output-name.txt' });

    const sourceImages = Array.isArray(jobPayload.sourceImages) ? jobPayload.sourceImages : [];
    for (let index = 0; index < sourceImages.length; index += 1) {
      const img = sourceImages[index];
      const diskPath = resolveCustomOrderImageDiskPath(img);
      if (!diskPath) {
        archive.append(`Missing source image at index ${index + 1}: ${img.originalName || 'unknown'}`, {
          name: `missing-image-${index + 1}.txt`
        });
        continue;
      }
      try {
        if (fs.existsSync(diskPath)) {
          const ext = path.extname(diskPath) || '.img';
          const safeName = sanitizeFilename(img.originalName || `source-image-${index + 1}`);
          const entryName = `source-image-${index + 1}-${safeName}${ext}`;
          archive.file(diskPath, { name: entryName });
        } else {
          archive.append(`Missing source image file: ${img.originalName || 'unknown'}`, {
            name: `missing-image-${index + 1}.txt`
          });
        }
      } catch (imgErr) {
        archive.append(`Failed to attach source image: ${img.originalName || 'unknown'} (${imgErr.message || imgErr})`, {
          name: `missing-image-${index + 1}.txt`
        });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('❌ Failed to export slicer packet:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to export slicer packet',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
});

router.get('/print-jobs/:printJobId/lithophane-packet.zip', async (req, res) => {
  try {
    const { printJobId } = req.params;
    const printJob = await PrintJob.findOne({ printJobId });
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found.' });
    }

    const customOrder = await CustomOrder.findOne({ orderId: printJob.orderId });
    if (!customOrder) {
      return res.status(404).json({ error: 'Linked custom order not found.' });
    }

    const normalizedOrder = normalizeCustomOrder(customOrder);
    const jobPayload = normalizePrintJobPayload(printJob);
    const orderPayload = {
      ...normalizedOrder,
      sourceImages: normalizedOrder.images,
    };

    const zipFilename = `lithophane-packet-${sanitizeFilename(printJob.printJobId)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('❌ Lithophane packet archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create lithophane packet' });
      } else {
        res.end();
      }
    });

    archive.pipe(res);

    archive.append(JSON.stringify(orderPayload, null, 2), { name: 'order.json' });
    archive.append(JSON.stringify(jobPayload, null, 2), { name: 'print-job.json' });
    archive.append(buildWorkOrderHtml(normalizedOrder, jobPayload), { name: 'work-order.html' });

    const instructions = [];
    instructions.push(`Lithophane Source Packet for Print Job ${printJob.printJobId}`);
    instructions.push('----------------------------------------');
    instructions.push(`Order: ${normalizedOrder.orderId}`);
    instructions.push(`Generation Method: ${printJob.generationMethod || 'Manual'}`);
    instructions.push(`Lithophane Type: ${printJob.lithophaneType || 'Custom'}`);
    instructions.push(`Target Size: ${printJob.targetWidthMm || 'N/A'}mm x ${printJob.targetHeightMm || 'N/A'}mm x ${printJob.targetDepthMm || 'N/A'}mm`);
    instructions.push(`Panel Count: ${printJob.panelCount || 1}`);
    instructions.push('');
    instructions.push('1. Open LithophaneMaker Desktop.');
    instructions.push('2. Import the source images included in this packet.');
    instructions.push('3. Set the target dimensions and rendering options per the details above.');
    instructions.push('4. Generate the STL and save it using the STL filename and version conventions below.');
    instructions.push('5. Attach the generated STL to this print job using the admin STL handoff form.');
    instructions.push('');
    instructions.push(`Suggested STL filename: ${printJob.stlFilename || `PJ-${printJob.printJobId}.stl`}`);
    instructions.push(`STL version: ${printJob.stlVersion || 'v1'}`);
    instructions.push('');
    instructions.push('Generation Notes:');
    instructions.push(printJob.generationNotes || 'None');
    archive.append(instructions.join('\n'), { name: 'lithophane-instructions.txt' });

    const outputName = `lithophane-packet-${sanitizeFilename(printJob.printJobId)}`;
    archive.append(outputName, { name: 'output-name.txt' });

    const sourceImages = Array.isArray(jobPayload.sourceImages) ? jobPayload.sourceImages : [];
    for (let index = 0; index < sourceImages.length; index += 1) {
      const img = sourceImages[index];
      const diskPath = resolveCustomOrderImageDiskPath(img);
      if (!diskPath) {
        archive.append(`Missing source image at index ${index + 1}: ${img.originalName || 'unknown'}`, {
          name: `missing-image-${index + 1}.txt`
        });
        continue;
      }
      try {
        if (fs.existsSync(diskPath)) {
          const ext = path.extname(diskPath) || '.img';
          const safeName = sanitizeFilename(img.originalName || `source-image-${index + 1}`);
          const entryName = `source-image-${index + 1}-${safeName}${ext}`;
          archive.file(diskPath, { name: entryName });
        } else {
          archive.append(`Missing source image file: ${img.originalName || 'unknown'}`, {
            name: `missing-image-${index + 1}.txt`
          });
        }
      } catch (imgErr) {
        archive.append(`Failed to attach source image: ${img.originalName || 'unknown'} (${imgErr.message || imgErr})`, {
          name: `missing-image-${index + 1}.txt`
        });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('❌ Failed to export lithophane packet:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to export lithophane packet',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
});

router.patch('/print-jobs/:printJobId/stl-handoff', async (req, res) => {
  try {
    const { printJobId } = req.params;
    const {
      stlFilename,
      stlPath,
      stlVersion,
      generationNotes,
      status,
    } = req.body;

    const validStatuses = [
      'queued_for_generation',
      'generating_stl',
      'stl_ready',
      'queued_for_slicing',
      'sliced',
      'queued_for_batch',
      'assigned_to_printer',
      'printing',
      'printed',
      'failed',
      'cancelled'
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Valid values: ${validStatuses.join(', ')}`
      });
    }

    const update = {};
    if (stlFilename !== undefined) update.stlFilename = stlFilename;
    if (stlPath !== undefined) update.stlPath = stlPath;
    if (stlVersion !== undefined) update.stlVersion = stlVersion;
    if (generationNotes !== undefined) update.generationNotes = generationNotes;
    if (status !== undefined) update.status = status;
    update.updatedAt = new Date();

    const printJob = await PrintJob.findOneAndUpdate(
      { printJobId },
      update,
      { new: true, runValidators: true }
    );

    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found.' });
    }

    res.json(normalizePrintJobPayload(printJob));
  } catch (err) {
    console.error('❌ Failed to update STL handoff:', err);
    res.status(500).json({
      error: 'Failed to update STL handoff',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.post('/batches', async (req, res) => {
  try {
    const {
      printerProfile,
      materialProfile,
      slicerProfile,
      nozzle,
      layerHeight,
      printJobIds = [],
      status,
      projectFilePath,
      gcodePath,
      notes,
    } = req.body;

    if (!printerProfile || !materialProfile || !nozzle || layerHeight === undefined) {
      return res.status(400).json({ error: 'printerProfile, materialProfile, nozzle, and layerHeight are required.' });
    }

    const batch = new Batch({
      printerProfile,
      materialProfile,
      slicerProfile: slicerProfile || '',
      nozzle,
      layerHeight,
      printJobIds: [],
      totalEstimatedPrintHours: 0,
      status: status || 'pending',
      projectFilePath: projectFilePath || '',
      gcodePath: gcodePath || '',
      notes: notes || '',
    });

    if (printJobIds.length) {
      const printJobs = await PrintJob.find({ printJobId: { $in: printJobIds } });
      const missingIds = printJobIds.filter((id) => !printJobs.some((job) => job.printJobId === id));
      if (missingIds.length) {
        return res.status(404).json({ error: `Print jobs not found: ${missingIds.join(', ')}` });
      }

      for (const job of printJobs) {
        if (!isPrintJobCompatibleWithBatch(job, batch)) {
          return res.status(400).json({
            error: `Print job ${job.printJobId} is not compatible with this batch.`
          });
        }
      }

      batch.printJobIds = printJobs.map((job) => job.printJobId);
      batch.totalEstimatedPrintHours = await computeBatchTotals(batch.printJobIds);
    }

    await batch.save();

    if (batch.printJobIds.length) {
      await PrintJob.updateMany(
        { printJobId: { $in: batch.printJobIds } },
        { assignedBatchId: batch.batchId }
      );
    }

    res.status(201).json(batch.toObject({ getters: true, virtuals: false }));
  } catch (err) {
    console.error('❌ Failed to create batch:', err);
    res.status(500).json({
      error: 'Failed to create batch',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.get('/batches', async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const batches = await Batch.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await Batch.countDocuments(filter);

    res.json({
      data: batches.map((batch) => batch.toObject({ getters: true, virtuals: false })),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
      }
    });
  } catch (err) {
    console.error('❌ Failed to fetch batches:', err);
    res.status(500).json({
      error: 'Failed to fetch batches',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.patch('/batches/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const {
      printerProfile,
      materialProfile,
      slicerProfile,
      nozzle,
      layerHeight,
      status,
      projectFilePath,
      gcodePath,
      notes,
    } = req.body;

    const update = {};
    if (printerProfile !== undefined) update.printerProfile = printerProfile;
    if (materialProfile !== undefined) update.materialProfile = materialProfile;
    if (slicerProfile !== undefined) update.slicerProfile = slicerProfile;
    if (nozzle !== undefined) update.nozzle = nozzle;
    if (layerHeight !== undefined) update.layerHeight = layerHeight;
    if (status !== undefined) update.status = status;
    if (projectFilePath !== undefined) update.projectFilePath = projectFilePath;
    if (gcodePath !== undefined) update.gcodePath = gcodePath;
    if (notes !== undefined) update.notes = notes;
    update.updatedAt = new Date();

    const batch = await Batch.findOneAndUpdate(
      { batchId },
      update,
      { new: true, runValidators: true }
    );

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found.' });
    }

    res.json(batch.toObject({ getters: true, virtuals: false }));
  } catch (err) {
    console.error('❌ Failed to update batch:', err);
    res.status(500).json({
      error: 'Failed to update batch',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.post('/batches/:batchId/assign', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { printJobId } = req.body;
    if (!printJobId) {
      return res.status(400).json({ error: 'printJobId is required.' });
    }

    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found.' });
    }

    const printJob = await PrintJob.findOne({ printJobId });
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found.' });
    }

    if (!isPrintJobCompatibleWithBatch(printJob, batch)) {
      return res.status(400).json({ error: 'Print job is not compatible with this batch.' });
    }

    if (printJob.assignedBatchId && printJob.assignedBatchId !== batch.batchId) {
      return res.status(400).json({ error: 'Print job is already assigned to a different batch.' });
    }

    if (!batch.printJobIds.includes(printJobId)) {
      batch.printJobIds.push(printJobId);
      batch.totalEstimatedPrintHours = await computeBatchTotals(batch.printJobIds);
      await batch.save();
    }

    printJob.assignedBatchId = batch.batchId;
    await printJob.save();

    res.json(batch.toObject({ getters: true, virtuals: false }));
  } catch (err) {
    console.error('❌ Failed to assign print job to batch:', err);
    res.status(500).json({
      error: 'Failed to assign print job to batch',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.post('/batches/:batchId/unassign', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { printJobId } = req.body;
    if (!printJobId) {
      return res.status(400).json({ error: 'printJobId is required.' });
    }

    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found.' });
    }

    const printJob = await PrintJob.findOne({ printJobId });
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found.' });
    }

    batch.printJobIds = batch.printJobIds.filter((id) => id !== printJobId);
    batch.totalEstimatedPrintHours = await computeBatchTotals(batch.printJobIds);
    await batch.save();

    if (printJob.assignedBatchId === batch.batchId) {
      printJob.assignedBatchId = '';
      await printJob.save();
    }

    res.json(batch.toObject({ getters: true, virtuals: false }));
  } catch (err) {
    console.error('❌ Failed to unassign print job from batch:', err);
    res.status(500).json({
      error: 'Failed to unassign print job from batch',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.patch('/print-jobs/:printJobId', async (req, res) => {
  try {
    const { printJobId } = req.params;
    const {
      printerProfile,
      materialProfile,
      slicerProfile,
      nozzle,
      layerHeight,
      infill,
      wallCount,
      status,
      assignedBatchId,
      stlPath,
      projectFilePath,
      gcodePath,
      estimatedPrintHours,
      notes,
    } = req.body;

    const validStatuses = ['queued_for_slicing', 'sliced', 'queued_for_batch', 'assigned_to_printer', 'printing', 'printed', 'failed', 'cancelled'];
    const update = {};

    if (printerProfile !== undefined) update.printerProfile = printerProfile;
    if (materialProfile !== undefined) update.materialProfile = materialProfile;
    if (slicerProfile !== undefined) update.slicerProfile = slicerProfile;
    if (nozzle !== undefined) update.nozzle = nozzle;
    if (layerHeight !== undefined) update.layerHeight = layerHeight;
    if (infill !== undefined) update.infill = infill;
    if (wallCount !== undefined) update.wallCount = wallCount;

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Valid values: ${validStatuses.join(', ')}`
        });
      }
      update.status = status;
    }

    if (assignedBatchId !== undefined) update.assignedBatchId = assignedBatchId;
    if (stlPath !== undefined) update.stlPath = stlPath;
    if (projectFilePath !== undefined) update.projectFilePath = projectFilePath;
    if (gcodePath !== undefined) update.gcodePath = gcodePath;
    if (estimatedPrintHours !== undefined) update.estimatedPrintHours = estimatedPrintHours;
    if (notes !== undefined) update.notes = notes;
    update.updatedAt = new Date();

    const printJob = await PrintJob.findOneAndUpdate(
      { printJobId },
      update,
      { new: true, runValidators: true }
    );

    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found.' });
    }

    res.json(normalizePrintJobPayload(printJob));
  } catch (err) {
    console.error('❌ Failed to update print job:', err);
    res.status(500).json({
      error: 'Failed to update print job',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// UPDATE custom order status
router.patch('/custom-orders/:orderId', async (req, res) => {
  try {
    const { status, fulfillmentStatus, adminNotes, paymentStatus, trackingCarrier, trackingNumber, trackingUrl } = req.body;
    const validStatuses = FULFILLMENT_STAGES;
    const validPaymentStatuses = ['pending', 'deposit_paid', 'paid_in_full', 'failed', 'refunded'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Valid values: ${validStatuses.join(', ')}`
      });
    }

    if (fulfillmentStatus && !validStatuses.includes(fulfillmentStatus)) {
      return res.status(400).json({
        error: `Invalid fulfillmentStatus. Valid values: ${validStatuses.join(', ')}`
      });
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        error: `Invalid paymentStatus. Valid values: ${validPaymentStatuses.join(', ')}`
      });
    }

    const customOrder = await CustomOrder.findOne({ orderId: req.params.orderId });
    if (!customOrder) {
      return res.status(404).json({ error: 'Custom order not found' });
    }

    const currentStage = customOrder.fulfillmentStatus || customOrder.status;
    const desiredStage = fulfillmentStatus || status;

    if (desiredStage && !isAllowedFulfillmentTransition(currentStage, desiredStage)) {
      return res.status(400).json({
        error: `Invalid transition from ${currentStage} to ${desiredStage}.`,
      });
    }

    const update = {};
    const timestamp = new Date();
    const appliedStatus = desiredStage;

    if (status) {
      update.status = status;
      update.fulfillmentStatus = status;
      const timeKey = getFulfillmentTimestampKey(status);
      if (timeKey) update[`fulfillmentTimestamps.${timeKey}`] = timestamp;
    }
    if (fulfillmentStatus) {
      update.fulfillmentStatus = fulfillmentStatus;
      update.status = fulfillmentStatus;
      const timeKey = getFulfillmentTimestampKey(fulfillmentStatus);
      if (timeKey) update[`fulfillmentTimestamps.${timeKey}`] = timestamp;
    }
    if (adminNotes !== undefined) update.adminNotes = adminNotes;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    if (trackingCarrier !== undefined) update.trackingCarrier = trackingCarrier;
    if (trackingNumber !== undefined) update.trackingNumber = trackingNumber;
    if (trackingUrl !== undefined) update.trackingUrl = trackingUrl;

    if (appliedStatus === 'deposit_paid') {
      update.depositPaidAt = timestamp;
    }

    const updatedCustomOrder = await CustomOrder.findOneAndUpdate(
      { orderId: req.params.orderId },
      update,
      { new: true, runValidators: true }
    );

    if (!updatedCustomOrder) {
      return res.status(404).json({ error: 'Custom order not found' });
    }

    console.log(`✅ Custom order ${req.params.orderId} updated to fulfillment status: ${appliedStatus}`);
    res.json(normalizeCustomOrder(updatedCustomOrder));
  } catch (err) {
    console.error('❌ Failed to update custom order:', err);
    res.status(500).json({
      error: 'Failed to update custom order',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ---- PROMO AUDIT ----
router.get('/promo-audit', requirePromoAdmin, async (req, res) => {
  try {
    const { promoCode, action, actor, limit = 50, offset = 0 } = req.query;
    const safeLimit = Math.min(Number(limit) || 50, 200);
    const safeOffset = Number(offset) || 0;
    const filter = {};

    if (promoCode) filter.promoCode = String(promoCode).toUpperCase();
    if (action) filter.action = String(action).toLowerCase();
    if (actor) filter['actor.username'] = String(actor);

    const [data, total] = await Promise.all([
      PromoAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit),
      PromoAuditLog.countDocuments(filter),
    ]);

    res.json({
      data,
      pagination: {
        total,
        limit: safeLimit,
        offset: safeOffset,
        hasMore: safeOffset + safeLimit < total,
      },
    });
  } catch (err) {
    console.error('❌ Failed to fetch promo audit logs:', err);
    res.status(500).json({
      error: 'Failed to fetch promo audit logs',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ---- PROMO CODES ----
const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/"/g, '""');
  if (/[",\n]/.test(text)) {
    return `"${text}"`;
  }
  return text;
};

const promoToCsv = (promo) => {
  return [
    promo.code,
    promo.description || '',
    promo.discountType,
    promo.discountValue,
    promo.isActive,
    promo.usageLimit ?? '',
    promo.usageCount ?? 0,
    promo.minimumOrderAmount ?? 0,
    Array.isArray(promo.allowedCategories) ? promo.allowedCategories.join('|') : '',
    Array.isArray(promo.allowedProducts) ? promo.allowedProducts.join('|') : '',
    promo.expiresAt ? new Date(promo.expiresAt).toISOString() : '',
  ].map(escapeCsvValue).join(',');
};

router.get('/promo-codes', requirePromoAdmin, async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    const codes = await PromoCode.find(filter).sort({ createdAt: -1 });
    res.json(codes);
  } catch (err) {
    console.error('❌ Failed to fetch promo codes:', err);
    res.status(500).json({
      error: 'Failed to fetch promo codes',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.get('/promo-codes/export', requirePromoAdmin, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const codes = await PromoCode.find().sort({ createdAt: -1 });

    await safeAuditLog({
      req,
      action: 'export',
      promoCode: null,
      metadata: { exportFormat: String(format).toLowerCase() },
    });

    if (String(format).toLowerCase() === 'csv') {
      const header = [
        'code',
        'description',
        'discountType',
        'discountValue',
        'isActive',
        'usageLimit',
        'usageCount',
        'minimumOrderAmount',
        'allowedCategories',
        'allowedProducts',
        'expiresAt',
      ].join(',');

      const rows = codes.map(promoToCsv);
      const csv = [header, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="promo-codes.csv"');
      return res.send(csv);
    }

    res.json(codes);
  } catch (err) {
    console.error('❌ Failed to export promo codes:', err);
    res.status(500).json({
      error: 'Failed to export promo codes',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.post('/promo-codes/import', requirePromoAdmin, async (req, res) => {
  try {
    const { items, mode = 'upsert' } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Import requires a non-empty items array' });
    }

    const operations = [];
    const errors = [];

    items.forEach((raw, index) => {
      if (!raw || !raw.code || !raw.discountType || raw.discountValue === undefined) {
        errors.push({ index, error: 'Missing code, discountType, or discountValue' });
        return;
      }

      const payload = buildPromoPayload(raw, req.session.admin?.username);
      payload.createdBy = raw.createdBy || req.session.admin?.username;

      operations.push({
        updateOne: {
          filter: { code: payload.code },
          update: { $set: payload, $setOnInsert: { createdAt: new Date() } },
          upsert: mode !== 'insert',
        },
      });
    });

    if (operations.length === 0) {
      return res.status(400).json({ error: 'No valid promo codes to import', errors });
    }

    const result = await PromoCode.bulkWrite(operations, { ordered: false });

    await safeAuditLog({
      req,
      action: 'import',
      promoCode: null,
      metadata: { importCount: operations.length },
    });

    res.json({
      imported: operations.length,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
      errors,
    });
  } catch (err) {
    console.error('❌ Failed to import promo codes:', err);
    res.status(500).json({
      error: 'Failed to import promo codes',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

router.post('/promo-codes', requirePromoAdmin, validatePromoCreate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payload = buildPromoPayload(req.body, req.session.admin?.username);
    payload.createdBy = req.session.admin?.username;

    const promo = new PromoCode(payload);
    await promo.save();

    await safeAuditLog({
      req,
      action: 'create',
      promoCode: promo.code,
      after: buildPromoSnapshot(promo),
    });

    res.status(201).json(promo);
  } catch (err) {
    console.error('❌ Failed to create promo code:', err);
    res.status(400).json({
      error: 'Failed to create promo code',
      details: err.message,
    });
  }
});

router.patch('/promo-codes/:id', requirePromoAdmin, validatePromoUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existingPromo = await PromoCode.findById(req.params.id);
    if (!existingPromo) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    const payload = buildPromoPayload(req.body, req.session.admin?.username);
    payload.updatedAt = new Date();

    const promo = await PromoCode.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    const beforeSnapshot = buildPromoSnapshot(existingPromo);
    const afterSnapshot = buildPromoSnapshot(promo);
    let action = 'update';
    if (typeof payload.isActive === 'boolean' && existingPromo.isActive !== promo.isActive) {
      action = promo.isActive ? 'enable' : 'disable';
    }

    await safeAuditLog({
      req,
      action,
      promoCode: promo.code,
      before: beforeSnapshot,
      after: afterSnapshot,
    });

    res.json(promo);
  } catch (err) {
    console.error('❌ Failed to update promo code:', err);
    res.status(400).json({
      error: 'Failed to update promo code',
      details: err.message,
    });
  }
});

router.delete('/promo-codes/:id', requirePromoAdmin, async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    await PromoCode.findByIdAndDelete(req.params.id);

    await safeAuditLog({
      req,
      action: 'delete',
      promoCode: promo.code,
      before: buildPromoSnapshot(promo),
    });

    res.json({ message: 'Promo code deleted successfully', deletedPromo: promo._id });
  } catch (err) {
    console.error('❌ Failed to delete promo code:', err);
    res.status(500).json({
      error: 'Failed to delete promo code',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

module.exports = router;
