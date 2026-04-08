const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  // Constraints
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  usageLimit: {
    type: Number,
    min: 1
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  minimumOrderAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  // Product/category restrictions
  allowedCategories: [{
    type: String,
    trim: true
  }],
  allowedProducts: [{
    type: String,
    trim: true
  }],
  // Metadata
  createdBy: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt before saving
promoCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
promoCodeSchema.index({ isActive: 1, expiresAt: 1 });
promoCodeSchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);