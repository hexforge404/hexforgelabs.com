const mongoose = require('mongoose');

const productAssetSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    checksum: {
      type: String,
      trim: true,
    },
    size_bytes: {
      type: Number,
      min: 0,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

productAssetSchema.index({ product: 1, type: 1 });

module.exports = mongoose.model('ProductAsset', productAssetSchema);
