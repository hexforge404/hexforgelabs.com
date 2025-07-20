const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

router.post('/', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Failed to save order:', err);
    res.status(500).json({ error: 'Order failed' });
  }

  {
    console.log('📦 Received new order:', req.body);

 
 }

});

module.exports = router;
