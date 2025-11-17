// backend/routes/payments.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order'); // existing Mongoose model

// Rate limiting
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many payment attempts, please try again later',
});

// Normalize BASE_URL so Stripe always gets https://...
const getBaseUrl = () => {
  let url = process.env.BASE_URL || 'https://hexforgelabs.com';

  // If it doesn't start with http/https, assume https://
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url.replace(/^\/+/, '');
  }

  // Strip trailing slashes
  return url.replace(/\/+$/, '');
};

// Email is OPTIONAL – if provided it must be valid
const validateCheckoutItems = [
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Valid email required if provided'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.name')
    .notEmpty()
    .withMessage('Item name is required'),
  body('items.*.price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be at least $0.01'),
];

// Create Stripe Checkout Session + create Order with orderId
router.post(
  '/create-checkout-session',
  paymentLimiter,
  validateCheckoutItems,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors:', errors.array());
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, name, items } = req.body;
      console.log('🧾 Stripe Checkout Payload:', JSON.stringify(req.body, null, 2));

      const safeEmail =
        email && email.trim().length > 0 ? email.trim() : undefined;
      const safeName = (name && name.trim()) || 'Guest';

      // Our own public-facing orderId
      const orderId = uuidv4();

      // Build Stripe line items + compute totals
      const lineItems = items.map((item) => {
        const price = Number(item.price);
        if (Number.isNaN(price)) {
          throw new Error(`Invalid price for item "${item.name}"`);
        }
        const quantity =
          typeof item.quantity === 'number' && item.quantity > 0
            ? item.quantity
            : 1;

        return {
          price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: Math.round(price * 100),
          },
          quantity,
        };
      });

      const totalCents = lineItems.reduce(
        (sum, li) => sum + li.price_data.unit_amount * li.quantity,
        0
      );
      const subtotal = totalCents / 100; // no tax/ship yet
      const total = subtotal; // keep separate for future tax/shipping

      const baseUrl = getBaseUrl();
      console.log('➡️ Using Stripe redirect base URL:', baseUrl);

      // Create Stripe session
      let session;
      try {
        session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: safeEmail, // may be undefined
          line_items: lineItems,
          // Redirect with OUR orderId, not the Stripe session id
          success_url: `${baseUrl}/success?orderId=${orderId}`,
          cancel_url: `${baseUrl}/store`,
          metadata: {
            name: safeName,
            orderId,
          },
        });
      } catch (err) {
        console.error('❌ Stripe Error:', err);
        return res.status(500).json({
          error: 'Stripe error',
          details: err.message,
        });
      }

      console.log('✅ Stripe session created:', session.id);

      // Now create an Order in Mongo linked to this session
      try {
        const shippingCost = 0;
        const tax = 0;

        const orderDoc = new Order({
          // Public-facing ID we generated earlier
          orderId,

          // Items – ensure quantity default = 1
          items: items.map((item) => ({
            productId: item._id || undefined, // keep if you pass productId from frontend
            name: item.name,
            price: Number(item.price),
            quantity: item.quantity || 1,
            image: item.image,
            sku: item.sku,
          })),

          // Money fields required by schema
          subtotal,
          shippingCost,
          tax,
          total,

          // Payment fields required by schema
          paymentMethod: 'stripe', // ✅ matches enum in schema
          paymentStatus: 'pending',
          status: 'pending',

          // Session linkage
          sessionId: req.sessionID,
          // Optional: keep Stripe session id if you add it to schema
          // stripeSessionId: session.id,

          // Customer object required by schema
          customer: {
            name: safeName || 'Guest',
            email: safeEmail || 'missing@hexforgelabs.local',
            ip: req.ip,
            // shippingAddress can stay empty for now
          },
        });

        await orderDoc.save();
        console.log('✅ Order saved with orderId:', orderId);
      } catch (err) {
        // We still let the user go to Stripe, but log this loudly
        console.warn('❌ Failed to save Order document:', err.message || err);
      }

      if (!session.url) {
        console.error('❌ Stripe session missing URL:', session);
        return res
          .status(500)
          .json({ error: 'Stripe did not return a checkout URL.' });
      }

      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('❌ Unknown Error in /create-checkout-session:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
