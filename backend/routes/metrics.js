const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const CustomOrder = require('../models/CustomOrder');
const StripeWebhookEvent = require('../models/StripeWebhookEvent');

const formatMetric = (name, value, help, type = 'gauge', labels = {}) => {
  const labelString = Object.keys(labels)
    .map((key) => `${key}="${String(labels[key]).replace(/"/g, '\\"')}"`)
    .join(',');
  const labelsPart = labelString ? `{${labelString}}` : '';
  return [`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`, `${name}${labelsPart} ${value}`].join('\n');
};

router.get('/', async (req, res) => {
  try {
    const pendingThresholdMinutes = Number(process.env.PAYMENT_PENDING_THRESHOLD_MINUTES || 30);
    const thresholdDate = new Date(Date.now() - pendingThresholdMinutes * 60 * 1000);

    const [totalOrders, totalCustomOrders, pendingOrders, pendingCustomOrders, totalWebhooks, processedWebhooks, failedWebhooks, ignoredWebhooks, missingLinkageOrders, missingLinkageCustomOrders, duplicatePaymentIntentsAgg] = await Promise.all([
      Order.countDocuments(),
      CustomOrder.countDocuments(),
      Order.countDocuments({ paymentStatus: 'pending', createdAt: { $lt: thresholdDate } }),
      CustomOrder.countDocuments({ paymentStatus: 'pending', createdAt: { $lt: thresholdDate } }),
      StripeWebhookEvent.countDocuments(),
      StripeWebhookEvent.countDocuments({ status: 'processed' }),
      StripeWebhookEvent.countDocuments({ status: 'failed' }),
      StripeWebhookEvent.countDocuments({ status: 'ignored' }),
      Order.countDocuments({ $and: [{ stripeSessionId: { $in: [null, ''] } }, { paymentIntentId: { $in: [null, ''] } }] }),
      CustomOrder.countDocuments({ $and: [{ stripeSessionId: { $in: [null, ''] } }, { paymentIntentId: { $in: [null, ''] } }] }),
      StripeWebhookEvent.aggregate([
        { $match: { paymentIntentId: { $exists: true, $ne: null } } },
        { $group: { _id: '$paymentIntentId', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'duplicateCount' },
      ]),
    ]);

    const duplicatePaymentIntents = Array.isArray(duplicatePaymentIntentsAgg) && duplicatePaymentIntentsAgg[0]
      ? duplicatePaymentIntentsAgg[0].duplicateCount
      : 0;

    const lines = [
      '# HELP hexforge_orders_total Total standard orders handled by the store',
      '# TYPE hexforge_orders_total gauge',
      `hexforge_orders_total ${totalOrders}`,
      '# HELP hexforge_custom_orders_total Total custom lamp orders',
      '# TYPE hexforge_custom_orders_total gauge',
      `hexforge_custom_orders_total ${totalCustomOrders}`,
      '# HELP hexforge_pending_orders_aged Total standard pending orders older than threshold',
      '# TYPE hexforge_pending_orders_aged gauge',
      `hexforge_pending_orders_aged ${pendingOrders}`,
      '# HELP hexforge_pending_custom_orders_aged Total custom pending orders older than threshold',
      '# TYPE hexforge_pending_custom_orders_aged gauge',
      `hexforge_pending_custom_orders_aged ${pendingCustomOrders}`,
      '# HELP hexforge_webhook_events_total Total Stripe webhook events received',
      '# TYPE hexforge_webhook_events_total gauge',
      `hexforge_webhook_events_total ${totalWebhooks}`,
      '# HELP hexforge_webhook_events_processed Total webhook events processed successfully',
      '# TYPE hexforge_webhook_events_processed gauge',
      `hexforge_webhook_events_processed ${processedWebhooks}`,
      '# HELP hexforge_webhook_events_failed Total webhook events that failed processing',
      '# TYPE hexforge_webhook_events_failed gauge',
      `hexforge_webhook_events_failed ${failedWebhooks}`,
      '# HELP hexforge_webhook_events_ignored Total webhook events ignored by handler',
      '# TYPE hexforge_webhook_events_ignored gauge',
      `hexforge_webhook_events_ignored ${ignoredWebhooks}`,
      '# HELP hexforge_orders_missing_stripe_linkage Total standard orders missing Stripe linkage',
      '# TYPE hexforge_orders_missing_stripe_linkage gauge',
      `hexforge_orders_missing_stripe_linkage ${missingLinkageOrders}`,
      '# HELP hexforge_custom_orders_missing_stripe_linkage Total custom orders missing Stripe linkage',
      '# TYPE hexforge_custom_orders_missing_stripe_linkage gauge',
      `hexforge_custom_orders_missing_stripe_linkage ${missingLinkageCustomOrders}`,
      '# HELP hexforge_webhook_duplicate_payment_intents_total Webhook events sharing the same payment intent ID',
      '# TYPE hexforge_webhook_duplicate_payment_intents_total gauge',
      `hexforge_webhook_duplicate_payment_intents_total ${duplicatePaymentIntents}`,
      '# HELP hexforge_monitoring_pending_threshold_minutes The configured pending payment threshold in minutes',
      '# TYPE hexforge_monitoring_pending_threshold_minutes gauge',
      `hexforge_monitoring_pending_threshold_minutes ${pendingThresholdMinutes}`,
    ];

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(lines.join('\n') + '\n');
  } catch (err) {
    console.error('❌ Failed to generate Prometheus metrics:', err);
    res.status(500).send('# ERROR failed to generate metrics\n');
  }
});

module.exports = router;
