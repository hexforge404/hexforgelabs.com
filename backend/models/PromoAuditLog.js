const mongoose = require('mongoose');

const promoAuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['create', 'update', 'enable', 'disable', 'delete', 'import', 'export'],
    required: true,
    index: true,
  },
  promoCode: {
    type: String,
    trim: true,
    uppercase: true,
    index: true,
  },
  actor: {
    username: {
      type: String,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      trim: true,
    },
  },
  before: {
    type: mongoose.Schema.Types.Mixed,
  },
  after: {
    type: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    importCount: Number,
    exportFormat: String,
    sourceIp: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

promoAuditLogSchema.index({ action: 1, createdAt: -1 });
promoAuditLogSchema.index({ promoCode: 1, createdAt: -1 });
promoAuditLogSchema.index({ 'actor.username': 1, createdAt: -1 });

module.exports = mongoose.model('PromoAuditLog', promoAuditLogSchema);
