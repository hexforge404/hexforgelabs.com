const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Product = require('../models/Product');
const Order = require('../models/Order');
const multer = require('multer');
const path = require('path');

const STATUS_VALUES = ['draft', 'active', 'archived'];

const uploadDir = path.join(__dirname, '../../frontend/public/images');
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.toLowerCase().replace(/\s+/g, '_');
    cb(null, safeName);
  }
});
const upload = multer({ storage });

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
    user: req.session.admin?.username || null
  });
});

// ⛔ Everything below this line requires admin session
router.use(requireAdmin);
router.use(adminLimiter);

// ⛔ Image upload is now admin-only
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ path: `/images/${req.file.filename}` });
});

// Product validation rules
const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0.01 }).withMessage('Valid price required'),
  body('description').optional().trim().escape(),
  body('stock').optional().isInt({ min: 0 }),
  body('images').optional().isArray()
];

// GET all products
function mapProduct(product) {
  const obj = product.toObject({ virtuals: true });
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

module.exports = router;
