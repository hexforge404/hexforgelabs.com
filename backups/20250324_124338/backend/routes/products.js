const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Adjust if needed

// GET /products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find(); // Pull from MongoDB
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
