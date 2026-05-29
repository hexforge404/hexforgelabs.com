const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    customerName: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    rating: { type: Number, min: 1, max: 5, required: true },
    reviewText: { type: String, trim: true, required: true },
    productType: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    media: {
      type: [
        {
          url: { type: String, trim: true, default: '' },
          type: { type: String, enum: ['image', 'video'], required: true },
          filename: { type: String, trim: true, default: '' },
          originalName: { type: String, trim: true, default: '' },
          mimeType: { type: String, trim: true, default: '' },
          size: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    mediaApproved: { type: Boolean, default: false },
    permissionToDisplay: { type: Boolean, required: true },
    permissionToUseName: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    source: { type: String, trim: true, default: 'website' },
  },
  {
    timestamps: true,
    strict: true,
  }
);

module.exports = mongoose.model('Review', reviewSchema);
