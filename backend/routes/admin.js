const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Product = require('../models/Product');
const Order = require('../models/Order');
const multer = require('multer');
const path = require('path');

const uploadDir = path.join(__dirname, '../../frontend/public/images');
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.toLowerCase().replace(/\s+/g, '_');
    cb(null, safeName);
  }
});
const upload = multer({ storage });

router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ path: `/images/${req.file.filename}` });
});


// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

// Session check endpoint (public)
router.get('/session', (req, res) => {
  console.log('🔐 Session check from IP:', req.ip);
  res.json({ 
    loggedIn: !!req.session.admin?.loggedIn,
    user: req.session.admin?.username 
  });
});

// 🔐 Require admin session for all routes below
router.use((req, res, next) => {
  if (!req.session.admin?.loggedIn) {
    console.warn('🚨 Unauthorized access attempt from IP:', req.ip);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Admin login required'
    });
  }
  next();
});

// Apply rate limiting to all admin routes
router.use(adminLimiter);

// Product validation rules
const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0.01 }).withMessage('Valid price required'),
  body('description').optional().trim().escape(),
  body('stock').optional().isInt({ min: 0 }),
  body('images').optional().isArray()
];

// GET all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
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
