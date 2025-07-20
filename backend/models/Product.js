const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0.01, 'Price must be at least 0.01'],
    set: v => parseFloat(v.toFixed(2)) // Always store 2 decimal places
  },
  image: {
    type: String,
    validate: {
      validator: function(v) {
        return (
          /^\/images\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v) || 
          /^[^/]+\.(jpg|jpeg|png|webp|gif)$/i.test(v) ||
          /^(https?:\/\/).+\.(jpg|jpeg|png|webp|gif)$/i.test(v)
        );
      },
      message: props => `${props.value} must be a valid image URL or a relative /images path!`
    }
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  
  
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  categories: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 5; // Max 5 categories per product
      },
      message: 'Cannot have more than 5 categories'
    }
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  sku: {
    type: String,
    unique: true,
    uppercase: true,
    required: [true, 'SKU is required'],
    match: [/^[A-Z0-9]{6,12}$/, 'SKU must be 6-12 alphanumeric characters']
  },
  
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'oz', 'lb'],
      default: 'g'
    }
  },
  ratings: {
    average: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      default: 5
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ isFeatured: 1 });

// Virtual for formatted price
productSchema.virtual('priceFormatted').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Pre-save hook to generate SKU if not provided
productSchema.pre('validate', function(next) {
  if (!this.sku) {
    this.sku = generateSKU(this.name || 'PRD');
  }
  next();
});


// Helper function to generate SKU
function generateSKU(name) {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 3)
    .padEnd(3, 'X'); // If name is too short, pad with 'X'

  return `${initials}${randomNum}`;
}


module.exports = mongoose.model('Product', productSchema);
