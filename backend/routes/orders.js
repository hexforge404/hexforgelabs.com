const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Order = require('../models/Order');
const { v4: uuidv4 } = require('uuid');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

// Initialize Mailgun client
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
  url: 'https://api.mailgun.net'
});

// Rate limiting configuration
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many order requests, please try again later'
});

// Order validation rules
const validateOrder = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.price').isFloat({ min: 0.01 }).withMessage('Valid price required'),
  body('customer.email').isEmail().withMessage('Valid email required'),
  body('customer.name').notEmpty().withMessage('Customer name is required'),
];

// Create a new order with validation and rate limiting
router.post('/', orderLimiter, validateOrder, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    console.log('📦 Incoming Order:', {
      items: req.body.items.map(i => i.name),
      customer: req.body.customer?.email
    });
    console.log('📦 Order session ID:', req.sessionID);
    console.log('📦 Order IP:', req.ip);
    

    // Calculate total with quantity support
    const total = req.body.items.reduce(
      (acc, item) => acc + (item.price * (item.quantity || 1)),
      0
    );

    // Create order
    const order = new Order({
      ...req.body,
      total,
      orderId: uuidv4(),
      status: 'pending',
      sessionId: req.sessionID,
      customer: {
        ...req.body.customer,
        ip: req.ip
      }
    });

    await order.save();

    // Prepare email recipients
    const recipientList = [
      process.env.TO_EMAIL,
      ...(req.body.customer?.email ? [req.body.customer.email] : []),
      process.env.BCC_EMAIL
    ].filter(Boolean);

    // Generate email content
    const emailContent = generateOrderEmail(order);

    // Send email notification
    try {
      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `HexForge Labs <${process.env.MAILGUN_FROM_EMAIL}>`,
        to: recipientList,
        subject: `New Order: ${order.orderId}`,
        text: emailContent.text,
        html: emailContent.html
      });
      console.log(`📧 Email sent successfully for Order ${order.orderId}`);
    } catch (emailErr) {
      console.warn(`⚠️ Failed to send email for Order ${order.orderId}:`, emailErr.message);
    }
    

    console.log(`✅ Order ${order.orderId} created successfully`);
    res.status(201).json(order);
  } catch (err) {
    console.error('❌ Order creation failed!');
    console.error('--- Full Error Stack ---');
    console.error(err.stack || err);
  
    if (err.response?.body) {
      console.error('--- Mailgun Error Response ---');
      console.error(err.response.body);
    }
  
    res.status(500).json({ 
      error: 'Order creation failed',
      details: process.env.NODE_ENV === 'development' ? (err.stack || err.message) : undefined
    });
  }
});
// Get a single order by session, IP, or email (fallback)
router.get('/latest', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
  const sessionId = req.sessionID;
  const email = req.query.email; // New fallback

  console.log('🔍 Looking for latest order with:');
  console.log('   Session:', sessionId);
  console.log('   IP:', ip);
  console.log('   Email:', email);

  const queryParts = [
    ...(ip ? [{ 'customer.ip': ip }] : []),
    ...(sessionId ? [{ sessionId }] : []),
    ...(email ? [{ 'customer.email': email }] : [])
  ];
  
  if (queryParts.length === 0) {
    return res.status(400).json({ message: 'No identifiers provided' });
  }
  
  const query = { $or: queryParts };
  

  try {
    const latestOrder = await Order.findOne(query).sort({ createdAt: -1 });

    if (!latestOrder) {
      console.warn('⚠️ No recent order found for:', query);
      return res.status(404).json({ message: 'No recent order found' });
    }

    res.json(latestOrder);
  } catch (err) {
    console.error('❌ Failed to fetch latest order:', err.stack || err);
    res.status(500).json({ error: 'Failed to fetch latest order' });
  }
});



// Get all orders with pagination and filtering
router.get('/', orderLimiter, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Order.countDocuments(filter)
    ]);

    res.json({
      data: orders,
      meta: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit)
      }
    });
  } catch (err) {
    console.error('❌ Failed to fetch orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
router.patch('/:id', orderLimiter, [
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status value')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Send status update email if configured
    if (process.env.SEND_STATUS_UPDATES === 'true' && order.customer?.email) {
      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `HexForge Labs <${process.env.MAILGUN_FROM_EMAIL}>`,
        to: order.customer.email,
        subject: `Order ${order.orderId} Status Update`,
        text: `Your order status has been updated to: ${order.status}`
      });
    }

    res.json(order);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an order
router.delete('/:id', orderLimiter, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('❌ Failed to delete order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get an order by its orderId (used on success page)
router.get('/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('❌ Error fetching order by ID:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});





module.exports = router;
