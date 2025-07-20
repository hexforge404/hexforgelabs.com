const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    index: true
  },
  customer: {
    name: {
      type: String,
      required: false,
      trim: true,
      default: 'Guest'
    },
    
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address']
    },
    phone: {
      type: String,
      trim: true
    },
    ip: { type: String },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0.01
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    image: String,
    sku: String
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0.01
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0.01
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'stripe', 'cash_on_delivery'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  trackingNumber: {
    type: String,
    index: true
  },
  shippingMethod: String,
  notes: String,
  couponCode: String,
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  sessionId: { type: String, index: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


// Indexes for better query performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ total: 1 });

// Virtual for formatted order date
orderSchema.virtual('orderDate').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Virtual for formatted total
orderSchema.virtual('totalFormatted').get(function() {
  return `$${this.total.toFixed(2)}`;
});

// Pre-save hook to calculate totals
orderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.subtotal = this.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    this.total = this.subtotal + this.shippingCost + this.tax - this.discountAmount;
  }
  next();
});

// Static method for order status counts
orderSchema.statics.getStatusCounts = async function() {
  return this.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
};

// Instance method for shipping update
orderSchema.methods.updateShipping = async function(trackingInfo) {
  this.trackingNumber = trackingInfo.number;
  this.shippingMethod = trackingInfo.method;
  this.status = 'shipped';
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);
