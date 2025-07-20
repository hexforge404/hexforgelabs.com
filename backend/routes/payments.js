const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order'); // ✅ import your Mongoose Order model

// Rate limiting
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many payment attempts, please try again later'
});

// Validate incoming checkout payload
const validateCheckoutItems = [
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.price').isFloat({ min: 0.01 }).withMessage('Price must be at least $0.01'),
];

// Create Stripe Checkout Session + save order first
router.post('/create-checkout-session', paymentLimiter, validateCheckoutItems, async (req, res) => {
  try {
    const errors = validationResult(req);
if (!errors.isEmpty()) {
  console.error('❌ Validation errors:', errors.array()); // <-- Add this line
  return res.status(400).json({ error: 'Validation failed', details: errors.array() });
}


    const { email, name, items } = req.body;
    console.log('🧾 Stripe Checkout Payload:', JSON.stringify(req.body, null, 2));

    const orderId = uuidv4();

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
    const tax = 0;
    const shippingCost = 0;
    const total = subtotal + tax + shippingCost;

    // Save order first
    const customerName = name?.trim() || 'Guest';
    const order = new Order({
      orderId,
      customer: {
        name,
        email,
        ip: req.ip
      },
      items,
      subtotal,
      tax,
      shippingCost,
      total,
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
      status: 'pending',
      sessionId: req.sessionID
    });

    await order.save();
    console.log(`🧾 Order pre-saved before Stripe redirect: ${orderId}`);

    // Format line_items for Stripe
    const line_items = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity || 1
    }));

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items,
      success_url: `https://hexforgelabs.com/success?orderId=${orderId}`,
      cancel_url: process.env.STRIPE_CANCEL_URL,
      metadata: {
        order_id: orderId,
        created_at: new Date().toISOString(),
        items: JSON.stringify(items)
      }
    });

    res.json({
      url: session.url,
      sessionId: session.id,
      orderId,
      expiresAt: session.expires_at
    });

  } catch (err) {
    console.error('[Stripe] Full Error:', err);
    return res.status(500).json({
      error: 'Payment processing failed',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
  
});

module.exports = router;
