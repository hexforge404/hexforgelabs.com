const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Product = require('../models/Product');

// Rate limiting configuration
const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many product requests, please try again later'
});

// Product validation rules
const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').optional().trim().escape(),
  body('price')
  .isFloat({ min: 0.01 })
  .withMessage('Price must be at least $0.01'),
  body('image')
  .optional()
  .matches(/^\/images\/.+\.(jpg|jpeg|png|webp|gif)$|^[^/]+\.(jpg|jpeg|png|webp|gif)$|^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i)
  .withMessage('Image must be a valid path or URL ending in .jpg, .png, etc.'),
  
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be 0 or greater'),
  body('categories').optional().isArray(),
  body('isFeatured').optional().isBoolean()
];

// GET all products with filtering and pagination
// GET all products with filtering and pagination
router.get('/', productLimiter, async (req, res) => {
  try {
    const { page = 1, limit = 20, featured, category, search, raw } = req.query;
    const filter = {};

    if (featured === 'true') filter.isFeatured = true;
    if (category) filter.categories = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Product.countDocuments(filter)
    ]);

    // 🔥 KEY DIFFERENCE: if ?raw=true, return array only
    if (raw === 'true') {
      return res.json(products);
    }

    // Normal API response (structured)
    res.json({
      data: products,
      meta: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// GET single product
router.get('/:id', productLimiter, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new product with validation
router.post('/', productLimiter, validateProduct, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array()); // 👈 Add this
      return res.status(400).json({ errors: errors.array() });
    }
    

    const { name } = req.body;

    // Check for existing product
    const existing = await Product.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: 'Product already exists' });
    }

    const product = new Product(req.body);
    const savedProduct = await product.save();

    console.log(`✅ Product created: ${savedProduct._id}`);
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ 
      error: 'Failed to add product',
      details: error.message
    });
  }
});

// Update product with validation
router.put('/:id', productLimiter, validateProduct, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log(`🔄 Product updated: ${updatedProduct._id}`);
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ 
      error: 'Failed to update product',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE product
router.delete('/:id', productLimiter, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log(`🗑️ Product deleted: ${deletedProduct._id}`);
    res.json({ 
      message: 'Product deleted successfully',
      deletedId: deletedProduct._id
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      error: 'Failed to delete product',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
