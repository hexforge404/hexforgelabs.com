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
  body('email').notEmpty().isEmail().withMessage('Valid email required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.price').isFloat({ min: 0.01 }).withMessage('Price must be at least $0.01'),
];

// Create Stripe Checkout Session + save order first
router.post('/create-checkout-session', paymentLimiter, validateCheckoutItems, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, name, items } = req.body;
    console.log('🧾 Stripe Checkout Payload:', JSON.stringify(req.body, null, 2));

    // ✅ Here's where you wrap the session creation
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: email,
        line_items: items.map(item => ({
          price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity || 1,
        })),
        success_url: `${process.env.BASE_URL}/success?orderid={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/store`,
        metadata: {
          name,
        }
      });
    } catch (err) {
      console.error('❌ Stripe Error:', err);
      return res.status(500).json({ error: 'Stripe error', details: err.message });
    }
    
    console.log('✅ Stripe session created:', session);


    if (!session.url) {
      console.error('❌ Stripe session failed:', session);
      return res.status(500).json({ error: 'Stripe did not return a checkout URL.' });
    }

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('❌ Unknown Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
