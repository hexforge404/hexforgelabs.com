const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { calculateSubtotal, calculateTax, roundMoney } = require('../utils/pricing');
const { requireAdmin } = require('../middleware/requireAdmin');
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

// Order validation rules
const validateOrder = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*').custom((item) => {
    if (!item) return false;
    return Boolean(item.productId || item._id || item.slug);
  }).withMessage('Each item must include productId, _id, or slug'),
  body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('customer.email').isEmail().withMessage('Valid email required'),
  body('customer.name').notEmpty().withMessage('Customer name is required'),
];

const resolveOrderItems = async (items = []) => {
  const resolved = [];

  for (const item of items) {
    const rawId = item.productId || item._id;
    const slug = item.slug;
    let product = null;

    if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
      product = await Product.findById(rawId);
    }

    if (!product && slug) {
      product = await Product.findOne({ slug: String(slug).toLowerCase().trim() });
    }

    if (!product) {
      throw new Error('Product not found for one or more items.');
    }

    const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;

    resolved.push({
      productId: product._id,
      name: product.title || product.name || 'Product',
      unitPrice: Number(product.price || 0),
      quantity,
      image: product.hero_image_url || product.image || null,
      sku: product.sku || undefined,
    });
  }

  return resolved;
};

const buildPublicOrderPayload = (order) => {
  const source = order.toObject ? order.toObject({ getters: true, virtuals: false }) : order;
  const images = Array.isArray(source.images) ? source.images.filter(Boolean) : undefined;
  const imagesCount = images?.length ?? (Number.isFinite(source.imagesCount) ? source.imagesCount : undefined);

  return {
    orderId: source.orderId,
    paymentStatus: source.paymentStatus,
    status: source.status,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    items: Array.isArray(source.items)
      ? source.items.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          sku: item.sku,
        }))
      : [],
    subtotal: source.subtotal,
    shippingCost: source.shippingCost,
    tax: source.tax,
    total: source.total,
    discountAmount: source.discountAmount,
    couponCode: source.couponCode,
    paymentMethod: source.paymentMethod,
    customer: {
      name: source.customer?.name || 'Guest',
      email: source.customer?.email || '',
      phone: source.customer?.phone || '',
      shippingAddress: source.customer?.shippingAddress || undefined,
    },
    shippingMethod: source.shippingMethod,
    trackingNumber: source.trackingNumber,
    notes: source.notes,
    depositAmount: source.depositAmount,
    remainingBalance: source.remainingBalance,
    images,
    imagesCount,
    productType: source.productType,
    orderType: source.orderType,
  };
};

// Create a new order with validation and rate limiting
router.post('/', orderLimiter, validateOrder, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idempotencyKey = getRequestIdempotencyKey(req, {
      customerEmail: req.body.customer?.email || '',
      customerName: req.body.customer?.name || '',
      items: Array.isArray(req.body.items)
        ? req.body.items.map((item) => ({
            productId: item.productId || item._id,
            slug: item.slug,
            quantity: Number(item.quantity) || 1,
          }))
        : [],
      paymentMethod: req.body.paymentMethod || 'stripe',
    });

    console.log('📦 Incoming Order:', {
      items: req.body.items.map(i => i.productId || i._id || i.slug),
      customer: req.body.customer?.email,
      idempotencyKey
    });
    console.log('📦 Order session ID:', req.sessionID);
    console.log('📦 Order IP:', req.ip);
    
    if (idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey });
      if (existing) {
        console.log(`🔁 Reusing existing order for idempotency key ${idempotencyKey}`);
        return res.status(200).json(existing);
      }
    }

    const resolvedItems = await resolveOrderItems(req.body.items);
    const subtotal = calculateSubtotal(resolvedItems);
    const tax = calculateTax(subtotal);
    const shippingCost = 0;
    const discountAmount = 0;
    const total = roundMoney(subtotal + tax + shippingCost - discountAmount);

    // Create order
    const order = new Order({
      ...req.body,
      idempotencyKey: idempotencyKey || undefined,
      items: resolvedItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        image: item.image,
        sku: item.sku,
      })),
      subtotal,
      shippingCost,
      tax,
      discountAmount,
      total,
      orderId: uuidv4(),
      status: 'pending',
      paymentMethod: req.body.paymentMethod || 'stripe',
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
  if (!req.session?.admin?.loggedIn && !req.sessionID) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
  const sessionId = req.sessionID;
  const email = req.query.email; // New fallback

  console.log('🔍 Looking for latest order with:');
  console.log('   Session:', sessionId);
  console.log('   IP:', ip);
  console.log('   Email:', email);

  const queryParts = req.session?.admin?.loggedIn
    ? [
        ...(ip ? [{ 'customer.ip': ip }] : []),
        ...(sessionId ? [{ sessionId }] : []),
        ...(email ? [{ 'customer.email': email }] : [])
      ]
    : [
        ...(sessionId ? [{ sessionId }] : [])
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
router.get('/', orderLimiter, requireAdmin, async (req, res) => {
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

// Delete an order
router.delete('/:id', orderLimiter, requireAdmin, async (req, res) => {
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

    if (req.session?.admin?.loggedIn) {
      return res.json(buildPublicOrderPayload(order));
    }

    // Allow the success page to load paid orders after Stripe redirect,
    // even if the original session cookie did not match.
    const isSameSession = order.sessionId && req.sessionID && order.sessionId === req.sessionID;
    const isPaidOrder = order.paymentStatus === 'paid';

    if (isSameSession || isPaidOrder) {
      return res.json(buildPublicOrderPayload(order));
    }

    console.warn(`⚠️ Unauthorized order access attempt: orderId=${req.params.orderId} sessionId=${req.sessionID}`);
    return res.status(401).json({ message: 'Unauthorized' });
  } catch (err) {
    console.error('❌ Error fetching order by ID:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PATCH /api/orders/:id/status
// PATCH /api/orders/:id/status - update order status
router.patch('/:id/status',
  orderLimiter,
  requireAdmin,
  [
    body('status')
      .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid status value'),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      const order = await Order.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Optional: status update email (kept from old route)
      if (process.env.SEND_STATUS_UPDATES === 'true' && order.customer?.email) {
        try {
          await mg.messages.create(process.env.MAILGUN_DOMAIN, {
            from: `HexForge Labs <${process.env.MAILGUN_FROM_EMAIL}>`,
            to: order.customer.email,
            subject: `Order ${order.orderId} Status Update`,
            text: `Your order status has been updated to: ${order.status}`,
          });
        } catch (emailErr) {
          console.warn('⚠️ Failed to send status email:', emailErr.message);
        }
      }

      return res.json({ data: order });
    } catch (err) {
      console.error('Error updating order status:', err);

      if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid order id' });
      }

      return res.status(500).json({ message: 'Server error' });
    }
  }
);






module.exports = router;
