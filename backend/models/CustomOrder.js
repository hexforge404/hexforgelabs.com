const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const customOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    default: () => `CO-${uuidv4()}`,
    unique: true,
    index: true
  },
  idempotencyKey: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
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
    type: new mongoose.Schema({
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
    }, { _id: false }),
    default: undefined
  },
  boxModularOptions: {
    type: new mongoose.Schema({
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
    }, { _id: false }),
    default: undefined
  },
  cylinderOptions: {
    type: new mongoose.Schema({
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
    }, { _id: false }),
    default: undefined
  },
  nightlightAddon: {
    type: new mongoose.Schema({
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
        publicUrl: String,
        relativePath: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    }, { _id: false }),
    default: undefined
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
      publicUrl: String,
      relativePath: String,
      originalName: String,
      mimeType: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  images: [{
    path: String,
    publicUrl: String,
    relativePath: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    panel: {
      type: Number,
      min: 1,
      max: 5
    },
    panelLabel: String
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
  fulfillmentStatus: {
    type: String,
    enum: ['submitted', 'awaiting_deposit', 'deposit_paid', 'reviewing_assets', 'print_ready', 'ready_to_ship', 'in_production', 'printed', 'assembled', 'packed', 'shipped', 'completed', 'cancelled'],
    default: 'submitted',
    index: true
  },
  fulfillmentTimestamps: {
    type: new mongoose.Schema({
      submittedAt: { type: Date },
      awaitingDepositAt: { type: Date },
      depositPaidAt: { type: Date },
      reviewingAssetsAt: { type: Date },
      printReadyAt: { type: Date },
      inProductionAt: { type: Date },
      printedAt: { type: Date },
      assembledAt: { type: Date },
      packedAt: { type: Date },
      shippedAt: { type: Date },
      completedAt: { type: Date },
      cancelledAt: { type: Date }
    }, { _id: false }),
    default: {}
  },
  depositPaidAt: {
    type: Date
  },
  stripeSessionId: {
    type: String,
    trim: true
  },
  paymentIntentId: {
    type: String,
    trim: true,
    index: true
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
    enum: ['submitted', 'awaiting_deposit', 'deposit_paid', 'reviewing_assets', 'print_ready', 'ready_to_ship', 'in_production', 'printed', 'assembled', 'packed', 'shipped', 'completed', 'cancelled'],
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
  isTest: {
    type: Boolean,
    default: false,
    index: true
  },
  testRunId: {
    type: String,
    trim: true,
    default: ''
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

  if (this.fulfillmentStatus && this.status !== this.fulfillmentStatus) {
    this.status = this.fulfillmentStatus;
  } else if (!this.fulfillmentStatus && this.status) {
    this.fulfillmentStatus = this.status;
  }

  next();
});

// Index for admin dashboard queries
customOrderSchema.index({ status: 1, createdAt: -1 });
customOrderSchema.index({ fulfillmentStatus: 1 });
customOrderSchema.index({ panels: 1, status: 1 });
customOrderSchema.index({ paymentStatus: 1 });
customOrderSchema.index({ 'customer.email': 1 });
customOrderSchema.index({ promoCode: 1 });

module.exports = mongoose.model('CustomOrder', customOrderSchema);
