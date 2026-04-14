const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const customOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    default: () => `CO-${uuidv4()}`,
    unique: true,
    index: true
  },
  productId: {
    type: String,
    required: true,
    index: true
  },
  productName: {
    type: String,
    required: true
  },
  productType: {
    type: String,
    default: 'panel',
    index: true
  },
  boxOptions: {
    lidType: {
      type: String,
      trim: true
    },
    topImageIncluded: {
      type: Boolean,
      default: false
    },
    lightingIncluded: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true
    }
  },
  boxModularOptions: {
    panelCount: {
      type: Number,
      default: 5
    },
    panelImages: {
      type: [String],
      default: []
    },
    extraPanelSet: {
      type: Boolean,
      default: false
    },
    lightingIncluded: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true
    }
  },
  cylinderOptions: {
    size: {
      type: String,
      enum: ['small', 'medium', 'large']
    },
    imageStyle: {
      type: String,
      trim: true
    },
    lightType: {
      type: String,
      trim: true
    },
    extras: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      trim: true
    }
  },
  customer: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: [ /\S+@\S+\.\S+/, 'Please use a valid email address' ]
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    shippingAddress: {
      street: {
        type: String,
        required: true,
        trim: true
      },
      city: {
        type: String,
        required: true,
        trim: true
      },
      state: {
        type: String,
        required: true,
        trim: true
      },
      zipCode: {
        type: String,
        required: true,
        trim: true
      },
      country: {
        type: String,
        required: true,
        trim: true
      }
    }
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  panels: {
    type: String,
    enum: ['single', 'double', 'triple', 'quad', 'five'],
    required: true,
    index: true
  },
  panelCount: {
    type: Number,
    min: 1,
    max: 5
  },
  lightType: {
    type: String,
    enum: ['led', 'incandescent', 'bulb', 'rgb', 'none'],
    default: 'led'
  },
  extras: {
    type: [String],
    default: []
  },
  nightlightAddon: {
    imageSource: {
      type: String,
      enum: ['main_existing', 'separate_upload'],
      default: 'main_existing'
    },
    selectedMainImageIndex: {
      type: Number,
      min: 0
    },
    separateImage: {
      path: String,
      originalName: String,
      mimeType: String,
      size: Number
    }
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  images: [{
    path: String,
    originalName: String,
    mimeType: String,
    size: Number,
    panel: {
      type: Number,
      min: 1,
      max: 5
    }
  }],
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  discountedTotal: {
    type: Number,
    min: 0
  },
  promoCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed']
  },
  discountValue: {
    type: Number,
    min: 0
  },
  discountAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  depositAmount: {
    type: Number,
    required: true,
    min: 0
  },
  remainingBalance: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'manual', 'cash'],
    default: 'stripe'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'deposit_paid', 'paid_in_full', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  depositPaidAt: {
    type: Date
  },
  stripeSessionId: {
    type: String,
    trim: true
  },
  trackingCarrier: {
    type: String,
    trim: true,
    default: ''
  },
  trackingNumber: {
    type: String,
    trim: true,
    default: ''
  },
  trackingUrl: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['submitted', 'awaiting_deposit', 'deposit_paid', 'reviewing_assets', 'in_production', 'ready_to_ship', 'shipped', 'completed', 'cancelled'],
    default: 'submitted',
    index: true
  },
  adminNotes: {
    type: String,
    trim: true,
    default: ''
  },
  confirmationSent: {
    type: Boolean,
    default: false
  },
  depositConfirmationSent: {
    type: Boolean,
    default: false
  },
  adminNotificationSent: {
    type: Boolean,
    default: false
  },
  lastEmailSentAt: {
    type: Date
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

// Update remainingBalance and updatedAt before saving
customOrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (typeof this.discountedTotal === 'number' && typeof this.depositAmount === 'number') {
    this.remainingBalance = Number(Math.max(0, this.discountedTotal - this.depositAmount).toFixed(2));
  } else if (typeof this.totalPrice === 'number' && typeof this.depositAmount === 'number') {
    this.remainingBalance = Number(Math.max(0, this.totalPrice - this.depositAmount).toFixed(2));
  }
  next();
});

// Index for admin dashboard queries
customOrderSchema.index({ status: 1, createdAt: -1 });
customOrderSchema.index({ panels: 1, status: 1 });
customOrderSchema.index({ paymentStatus: 1 });
customOrderSchema.index({ 'customer.email': 1 });
customOrderSchema.index({ promoCode: 1 });

module.exports = mongoose.model('CustomOrder', customOrderSchema);
