// backend/routes/payments.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Order = require('../models/Order'); // existing Mongoose model
const Product = require('../models/Product');
const { calculateSubtotal, calculateTax, roundMoney } = require('../utils/pricing');

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
  body('items.*').custom((item) => {
    if (!item) return false;
    return Boolean(item.productId || item._id || item.slug);
  }).withMessage('Each item must include productId, _id, or slug'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
];

const resolveCheckoutItems = async (items = []) => {
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

      const resolvedItems = await resolveCheckoutItems(items);
      const subtotal = calculateSubtotal(resolvedItems);
      const tax = calculateTax(subtotal);
      const total = roundMoney(subtotal + tax);

      const lineItems = resolvedItems.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round(item.unitPrice * 100),
        },
        quantity: item.quantity,
      }));

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
          items: resolvedItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.unitPrice,
            quantity: item.quantity,
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
          stripeSessionId: session.id,
          paymentIntentId: session.payment_intent || undefined,

          // Customer object required by schema
          customer: {
            name: safeName || 'Guest',
            email: safeEmail || 'missing@hexforge-labs.local',
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

// Stripe Webhook Endpoint
// -----------------------
// Use Stripe webhooks to update order state after payment completes.
// Local testing:
//   stripe listen --forward-to localhost:8000/api/payments/webhook
// Stripe dashboard setup:
//   endpoint: https://hexforgelabs.com/api/payments/webhook
//   events: checkout.session.completed

router.post('/webhook', async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'];

  if (!webhookSecret) {
    console.error('❌ Stripe webhook secret is not configured');
    return res.status(500).send('Stripe webhook secret not configured');
  }

  if (!signature) {
    console.error('❌ Missing Stripe signature header');
    return res.status(400).send('Missing Stripe signature');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody || req.body, signature, webhookSecret);
  } catch (err) {
    console.error('❌ Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`➡️ Stripe webhook event received: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      console.error('❌ Missing orderId in Stripe session metadata');
      return res.status(400).send('Missing orderId');
    }

    try {
      const order = await Order.findOne({ orderId });

      if (!order) {
        console.error(`❌ Order not found for orderId=${orderId}`);
        return res.status(404).send('Order not found');
      }

      order.paymentStatus = 'paid';
      order.status = 'processing';
      order.stripeSessionId = session.id;
      if (session.payment_intent) {
        order.paymentIntentId = session.payment_intent;
      }

      await order.save();

      console.log(`✅ Order updated from Stripe webhook: orderId=${orderId} sessionId=${session.id}`);
      return res.json({ received: true });
    } catch (err) {
      console.error(`❌ Failed to update order for orderId=${orderId}:`, err);
      return res.status(500).send('Order update failed');
    }
  }

  console.log(`ℹ️ Event type ${event.type} is not handled by this webhook.`);
  return res.json({ received: true });
});

module.exports = router;
