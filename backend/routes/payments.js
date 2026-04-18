// backend/routes/payments.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const crypto = require('crypto');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const Order = require('../models/Order'); // existing Mongoose model
const CustomOrder = require('../models/CustomOrder');
const StripeWebhookEvent = require('../models/StripeWebhookEvent');
const Product = require('../models/Product');
const { calculateSubtotal, calculateTax, roundMoney } = require('../utils/pricing');

const monitoringAlertRecipients = (process.env.MONITORING_ALERT_RECIPIENTS || process.env.TO_EMAIL || '')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);
const monitoringMailgunClient = process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN
  ? mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY, url: 'https://api.mailgun.net' })
  : null;

const sendMonitoringAlert = async ({ subject, text, details }) => {
  const pagerDutyKey = process.env.PAGERDUTY_ROUTING_KEY;
  const pagerDutyUrl = process.env.PAGERDUTY_WEBHOOK_URL;
  const alerts = [];

  if (pagerDutyKey || pagerDutyUrl) {
    try {
      const body = pagerDutyKey
        ? {
            routing_key: pagerDutyKey,
            event_action: 'trigger',
            payload: {
              summary: subject,
              source: 'hexforge-backend',
              severity: 'critical',
              custom_details: details,
            },
          }
        : {
            summary: subject,
            source: 'hexforge-backend',
            custom_details: details,
          };

      const url = pagerDutyUrl || 'https://events.pagerduty.com/v2/enqueue';
      const headers = {
        'Content-Type': 'application/json',
      };
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`PagerDuty alert failed: ${response.status} ${response.statusText}`);
      }
      alerts.push('pagerduty');
    } catch (err) {
      console.warn('⚠️ Monitoring PagerDuty alert failed:', err.message || err);
    }
  }

  if (monitoringMailgunClient && monitoringAlertRecipients.length > 0) {
    try {
      await monitoringMailgunClient.messages.create(process.env.MAILGUN_DOMAIN, {
        from: process.env.MONITORING_ALERT_FROM_EMAIL || `HexForge Monitoring <alerts@${process.env.MAILGUN_DOMAIN}>`,
        to: monitoringAlertRecipients,
        subject,
        text: `${subject}\n\n${text}\n\nDetails:\n${JSON.stringify(details || {}, null, 2)}`,
      });
      alerts.push('email');
    } catch (err) {
      console.warn('⚠️ Monitoring alert email failed:', err.message || err);
    }
  }

  if (alerts.length === 0) {
    console.info('ℹ️ Monitoring alert not sent because no alert destination is configured');
  }
};

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
      const safeEmail =
        email && email.trim().length > 0 ? email.trim() : undefined;
      const safeName = (name && name.trim()) || 'Guest';
      const idempotencyKey = getRequestIdempotencyKey(req, {
        email: safeEmail || '',
        name: safeName,
        items: Array.isArray(items)
          ? items.map((item) => ({
              productId: item.productId || item._id,
              slug: item.slug,
              quantity: Number(item.quantity) || 1,
            }))
          : [],
      });
      console.info('🧾 Stripe Checkout Payload:', JSON.stringify(req.body, null, 2));
      console.info('🧾 Order idempotency key:', idempotencyKey);
      console.info('🛒 Checkout creation request', {
        email: safeEmail || null,
        name: safeName,
        itemCount: Array.isArray(items) ? items.length : 0,
        idempotencyKey,
        sessionId: req.sessionID,
        ip: req.ip,
      });
      if (idempotencyKey) {
        const existingOrder = await Order.findOne({ idempotencyKey });
        if (existingOrder) {
          try {
            const existingSession = existingOrder.stripeSessionId
              ? await stripe.checkout.sessions.retrieve(existingOrder.stripeSessionId)
              : null;
            if (existingSession && existingSession.url) {
              return res.status(200).json({ url: existingSession.url });
            }
          } catch (err) {
            console.warn('⚠️ Failed to retrieve existing Stripe session for idempotent checkout:', err.message || err);
          }
        }
      }

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
          payment_intent_data: {
            metadata: {
              orderId,
              type: 'standard-order',
              name: safeName,
              email: safeEmail || '',
              idempotencyKey,
            },
          },
          // Redirect with OUR orderId, not the Stripe session id
          success_url: `${baseUrl}/success?orderId=${orderId}`,
          cancel_url: `${baseUrl}/store`,
          metadata: {
            name: safeName,
            orderId,
            idempotencyKey,
          },
        });
      } catch (err) {
        console.error('❌ Stripe Error:', err);
        return res.status(500).json({
          error: 'Stripe error',
          details: err.message,
        });
      }

      console.info('✅ Stripe session created', {
        orderId,
        stripeSessionId: session.id,
        paymentIntentId: session.payment_intent || null,
        amount: session.amount_total,
      });

      // Now create an Order in Mongo linked to this session
      try {
        const shippingCost = 0;
        const tax = 0;

        const orderDoc = new Order({
          // Public-facing ID we generated earlier
          orderId,
          idempotencyKey: idempotencyKey || undefined,
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

const getOrderByStripeMetadata = async (metadata, stripeSessionId, paymentIntentId) => {
  const query = { $or: [] };
  if (metadata?.orderId) query.$or.push({ orderId: metadata.orderId });
  if (metadata?.idempotencyKey) query.$or.push({ idempotencyKey: metadata.idempotencyKey });
  if (stripeSessionId) query.$or.push({ stripeSessionId });
  if (paymentIntentId) query.$or.push({ paymentIntentId });
  if (query.$or.length === 0) return { order: null, customOrder: null };

  const [order, customOrder] = await Promise.all([
    Order.findOne(query),
    CustomOrder.findOne(query),
  ]);
  return { order, customOrder };
};

const logStripeWebhookEvent = async ({
  event,
  metadata,
  stripeSessionId,
  paymentIntentId,
  signatureHeader,
  status = 'received',
  orderId,
  customOrderId,
  resultMessage,
  errorMessage,
}) => {
  try {
    const existing = await StripeWebhookEvent.findOne({ stripeEventId: event.id });
    const result = await StripeWebhookEvent.findOneAndUpdate(
      { stripeEventId: event.id },
      {
        type: event.type,
        payload: event,
        metadata,
        stripeSessionId,
        paymentIntentId,
        signatureHeader,
        status,
        orderId,
        customOrderId,
        resultMessage,
        errorMessage,
        receivedAt: new Date(),
        processedAt: status !== 'received' ? new Date() : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (status === 'failed' && existing?.status !== 'failed') {
      sendMonitoringAlert({
        subject: `Stripe webhook failure detected: ${event.type}`,
        text: `Stripe webhook ${event.id} failed while processing ${event.type}.\nOrderId: ${orderId || 'n/a'}\nCustomOrderId: ${customOrderId || 'n/a'}\nStripeSessionId: ${stripeSessionId || 'n/a'}\nPaymentIntentId: ${paymentIntentId || 'n/a'}\nError: ${errorMessage || resultMessage || 'unknown'}`,
        details: {
          eventId: event.id,
          type: event.type,
          orderId,
          customOrderId,
          stripeSessionId,
          paymentIntentId,
          status,
          errorMessage,
          resultMessage,
        },
      }).catch((err) => {
        console.warn('⚠️ sendMonitoringAlert failed:', err.message || err);
      });
    }

    return result;
  } catch (err) {
    console.warn('⚠️ Failed to save Stripe webhook audit record:', err.message || err);
    return null;
  }
};

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

  console.info('📩 Stripe webhook received', {
    id: event.id,
    type: event.type,
    created: event.created,
    attemptCount: event.request?.attempt_count || null,
    stripeSignaturePresent: Boolean(signature),
  });

  const eventLog = await logStripeWebhookEvent({
    event,
    metadata: event.data?.object?.metadata || {},
    stripeSessionId: event.data?.object?.id,
    paymentIntentId: event.data?.object?.payment_intent || event.data?.object?.id,
    signatureHeader: signature,
    status: 'received',
  });

  if (eventLog?.status === 'processed') {
    console.info('↪️ Duplicate Stripe webhook event already processed', {
      eventId: event.id,
      type: event.type,
    });
    return res.json({ received: true });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    let session = null;
    let paymentIntentId = null;
    let metadata = null;

    if (event.type === 'checkout.session.completed') {
      session = event.data.object;
      paymentIntentId = session.payment_intent;
      metadata = session.metadata || {};
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      paymentIntentId = paymentIntent.id;
      metadata = paymentIntent.metadata || {};
    }

    try {
      const { order, customOrder } = await getOrderByStripeMetadata(metadata, session?.id, paymentIntentId);
      if (!order && !customOrder) {
        console.warn('❌ No order found for Stripe webhook event', {
          orderId: metadata?.orderId,
          stripeSessionId: session?.id,
          paymentIntentId,
        });
        await logStripeWebhookEvent({
          event,
          metadata,
          stripeSessionId: session?.id,
          paymentIntentId,
          signatureHeader: signature,
          status: 'failed',
          resultMessage: 'No matching order or custom order found',
        });
        return res.status(404).send('Order not found');
      }

      if (order) {
        console.info('✅ Applying webhook update to standard order', {
          orderId: order.orderId,
          existingPaymentStatus: order.paymentStatus,
          paymentIntentId,
          stripeSessionId: session?.id,
        });
        if (order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.status = 'processing';
        }
        if (session?.id) order.stripeSessionId = session.id;
        if (paymentIntentId) order.paymentIntentId = paymentIntentId;
        await order.save();
        console.log(`✅ Order updated from Stripe webhook: orderId=${order.orderId} paymentStatus=${order.paymentStatus}`);
      }

      if (customOrder) {
        console.info('✅ Applying webhook update to custom order', {
          orderId: customOrder.orderId,
          existingPaymentStatus: customOrder.paymentStatus,
          paymentIntentId,
          stripeSessionId: session?.id,
        });
        if (customOrder.paymentStatus !== 'deposit_paid') {
          customOrder.paymentStatus = 'deposit_paid';
          customOrder.status = 'deposit_paid';
          customOrder.fulfillmentStatus = 'deposit_paid';
          customOrder.depositPaidAt = new Date();
          customOrder.fulfillmentTimestamps = customOrder.fulfillmentTimestamps || {};
          customOrder.fulfillmentTimestamps.depositPaidAt = new Date();
        }
        if (session?.id) customOrder.stripeSessionId = session.id;
        if (paymentIntentId) customOrder.paymentIntentId = paymentIntentId;
        await customOrder.save();
        console.log(`✅ Custom order updated from Stripe webhook: orderId=${customOrder.orderId} paymentStatus=${customOrder.paymentStatus}`);
      }

      await logStripeWebhookEvent({
        event,
        metadata,
        stripeSessionId: session?.id,
        paymentIntentId,
        signatureHeader: signature,
        status: 'processed',
        orderId: order?.orderId,
        customOrderId: customOrder?.orderId,
        resultMessage: 'Stripe webhook applied to order record',
      });

      console.info('✅ Stripe webhook processed', {
        eventId: event.id,
        orderId: order?.orderId || customOrder?.orderId,
        customOrderId: customOrder?.orderId,
        paymentIntentId,
        stripeSessionId: session?.id,
      });

      return res.json({ received: true });
    } catch (err) {
      console.error('❌ Failed to process webhook event:', err);
      await logStripeWebhookEvent({
        event,
        metadata,
        stripeSessionId: session?.id,
        paymentIntentId,
        signatureHeader: signature,
        status: 'failed',
        errorMessage: err.message || String(err),
      });
      return res.status(500).send('Webhook processing failed');
    }
  }

  console.info('ℹ️ Stripe webhook event ignored by handler', {
    eventId: event.id,
    type: event.type,
  });
  await logStripeWebhookEvent({
    event,
    metadata: event.data?.object?.metadata || {},
    stripeSessionId: event.data?.object?.id,
    paymentIntentId: event.data?.object?.payment_intent || event.data?.object?.id,
    signatureHeader: signature,
    status: 'processed',
    resultMessage: 'Event type ignored by webhook',
  });
  return res.json({ received: true });
});

router.get('/verify-payment/:orderId', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('⚠️ Payment verification attempted without Stripe configured');
      return res.status(400).json({ error: 'Stripe is not configured for payment verification.' });
    }

    const { orderId } = req.params;
    const { stripeSessionId, paymentIntentId } = req.query;

    const [order, customOrder] = await Promise.all([
      Order.findOne({ orderId }),
      CustomOrder.findOne({ orderId }),
    ]);

    const target = order || customOrder;
    if (!target) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const sessionIdentifier = String(stripeSessionId || target.stripeSessionId || '').trim();
    const intentIdentifier = String(paymentIntentId || target.paymentIntentId || '').trim();
    if (!sessionIdentifier && !intentIdentifier) {
      console.warn('⚠️ Verify payment called without Stripe identifiers for order', { orderId });
      return res.status(400).json({ error: 'No Stripe sessionId or paymentIntentId available to verify payment.' });
    }

    let session = null;
    let paymentIntent = null;
    let stripeStatus = null;

    if (sessionIdentifier) {
      try {
        session = await stripe.checkout.sessions.retrieve(sessionIdentifier, { expand: ['payment_intent'] });
        console.info('🔎 Verified Stripe session during payment audit', {
          orderId,
          sessionIdentifier,
          paymentIntent: session.payment_intent?.id || null,
          paymentStatus: session.payment_status,
        });
      } catch (err) {
        console.warn('⚠️ Failed to retrieve Stripe session during verify-payment:', err.message || err);
      }
    }

    if (!paymentIntent && session?.payment_intent) {
      paymentIntent = session.payment_intent;
    }

    if (!paymentIntent && intentIdentifier) {
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(intentIdentifier);
        console.info('🔎 Verified Stripe payment intent during payment audit', {
          orderId,
          intentIdentifier,
          paymentStatus: paymentIntent.status,
        });
      } catch (err) {
        console.warn('⚠️ Failed to retrieve Stripe payment intent during verify-payment:', err.message || err);
      }
    }

    stripeStatus = session?.payment_status || paymentIntent?.status;
    const isPaid = ['paid', 'succeeded'].includes(String(stripeStatus || '').toLowerCase());

    if (isPaid) {
      console.info('🔁 Recovery payment verification triggered', {
        orderId: target.orderId,
        orderType: order ? 'standard' : 'custom',
        stripeStatus,
        dbStatus: target.paymentStatus,
      });
      if (order) {
        order.paymentStatus = 'paid';
        order.status = order.status === 'pending' ? 'processing' : order.status;
      }
      if (customOrder) {
        customOrder.paymentStatus = 'deposit_paid';
        customOrder.status = 'deposit_paid';
        customOrder.fulfillmentStatus = 'deposit_paid';
        customOrder.depositPaidAt = customOrder.depositPaidAt || new Date();
        customOrder.fulfillmentTimestamps = customOrder.fulfillmentTimestamps || {};
        customOrder.fulfillmentTimestamps.depositPaidAt = customOrder.fulfillmentTimestamps.depositPaidAt || new Date();
      }

      if (session?.id) target.stripeSessionId = session.id;
      if (paymentIntent?.id) target.paymentIntentId = paymentIntent.id;
      await target.save();
    }

    return res.json({
      verified: isPaid,
      orderId: target.orderId,
      orderType: order ? 'standard' : 'custom',
      paymentStatus: target.paymentStatus,
      status: target.status,
      stripeStatus,
      stripeSessionId: session?.id || sessionIdentifier,
      paymentIntentId: paymentIntent?.id || intentIdentifier,
    });
  } catch (err) {
    console.error('❌ Verify payment failed:', err);
    return res.status(500).json({
      error: 'Verify payment failed',
      details: process.env.NODE_ENV === 'development' ? err.message || String(err) : undefined,
    });
  }
});

module.exports = router;
