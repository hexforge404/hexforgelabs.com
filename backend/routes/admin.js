const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Product = require('../models/Product');
const Order = require('../models/Order');
const CustomOrder = require('../models/CustomOrder');
const PromoCode = require('../models/PromoCode');
const PromoAuditLog = require('../models/PromoAuditLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
      data: customOrders,
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

// GET single custom order by ID
router.get('/custom-orders/:orderId', async (req, res) => {
  try {
    const customOrder = await CustomOrder.findOne({ orderId: req.params.orderId });
    
    if (!customOrder) {
      return res.status(404).json({ error: 'Custom order not found' });
    }

    res.json(customOrder);
  } catch (err) {
    console.error('❌ Failed to fetch custom order:', err);
    res.status(500).json({
      error: 'Failed to fetch custom order',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// UPDATE custom order status
router.patch('/custom-orders/:orderId', async (req, res) => {
  try {
    const { status, adminNotes, paymentStatus, trackingCarrier, trackingNumber, trackingUrl } = req.body;
    const validStatuses = ['submitted', 'awaiting_deposit', 'deposit_paid', 'reviewing_assets', 'in_production', 'ready_to_ship', 'shipped', 'completed', 'cancelled'];
    const validPaymentStatuses = ['pending', 'deposit_paid', 'paid_in_full', 'failed', 'refunded'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Valid values: ${validStatuses.join(', ')}`
      });
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        error: `Invalid paymentStatus. Valid values: ${validPaymentStatuses.join(', ')}`
      });
    }

    const update = {};
    if (status) update.status = status;
    if (adminNotes !== undefined) update.adminNotes = adminNotes;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    if (trackingCarrier !== undefined) update.trackingCarrier = trackingCarrier;
    if (trackingNumber !== undefined) update.trackingNumber = trackingNumber;
    if (trackingUrl !== undefined) update.trackingUrl = trackingUrl;

    const customOrder = await CustomOrder.findOneAndUpdate(
      { orderId: req.params.orderId },
      update,
      { new: true, runValidators: true }
    );

    if (!customOrder) {
      return res.status(404).json({ error: 'Custom order not found' });
    }

    console.log(`✅ Custom order ${req.params.orderId} updated to status: ${status}`);
    res.json(customOrder);
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
