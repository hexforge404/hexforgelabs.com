const mongoose = require('mongoose');

const STATUS_VALUES = ['draft', 'active', 'archived'];

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [4000, 'Description cannot exceed 4000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative'],
      set: (v) => Number.parseFloat(Number(v || 0).toFixed(2)),
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'draft',
      index: true,
    },
    category: {
      type: String,
      default: 'uncategorized',
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters'],
      index: true,
    },
    hero_image_url: {
      type: String,
      trim: true,
    },
    source_job: {
      job_id: { type: String, trim: true, index: true },
      subfolder: { type: String, trim: true },
      manifest_url: { type: String, trim: true },
      public_root: { type: String, trim: true },
    },
    version: {
      type: String,
      default: '1.0.0',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      set: (vals = []) =>
        (Array.isArray(vals) ? vals : [vals])
          .map((t) => String(t || '').trim())
          .filter(Boolean),
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      maxlength: [64, 'SKU cannot exceed 64 characters'],
      index: true,
    },
    freeze_assets: {
      type: Boolean,
      default: false,
    },

    // Legacy compatibility fields (kept so existing UI components continue to render)
    brand: {
      type: String,
      default: 'HexForge',
      trim: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ category: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ status: 1, created_at: -1 });

productSchema.virtual('priceFormatted').get(function priceFormatted() {
  if (typeof this.price !== 'number') return '$0.00';
  return `$${this.price.toFixed(2)}`;
});

productSchema.virtual('name')
  .get(function nameGetter() {
    return this.title;
  })
  .set(function nameSetter(v) {
    this.title = v;
  });

productSchema.virtual('image')
  .get(function imageGetter() {
    return this.hero_image_url;
  })
  .set(function imageSetter(v) {
    this.hero_image_url = v;
  });

module.exports = mongoose.model('Product', productSchema);
