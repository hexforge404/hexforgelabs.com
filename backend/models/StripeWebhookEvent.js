const mongoose = require('mongoose');

const stripeWebhookEventSchema = new mongoose.Schema({
  stripeEventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['received', 'processed', 'failed'],
    default: 'received',
    index: true,
  },
  stripeSessionId: {
    type: String,
    trim: true,
    index: true,
  },
  paymentIntentId: {
    type: String,
    trim: true,
    index: true,
  },
  orderId: {
    type: String,
    trim: true,
    index: true,
  },
  customOrderId: {
    type: String,
    trim: true,
    index: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  signatureHeader: {
    type: String,
    trim: true,
  },
  resultMessage: String,
  errorMessage: String,
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  processedAt: Date,
}, {
  timestamps: false,
});

stripeWebhookEventSchema.index({ receivedAt: -1 });

module.exports = mongoose.model('StripeWebhookEvent', stripeWebhookEventSchema);
