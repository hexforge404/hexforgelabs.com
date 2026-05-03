const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const photoCheckRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      default: () => `PC-${uuidv4()}`,
      unique: true,
      index: true,
    },
    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: [ /\S+@\S+\.\S+/, 'Please use a valid email address' ],
      },
    },
    product: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      path: {
        type: String,
        required: true,
      },
      publicUrl: {
        type: String,
        required: true,
      },
      relativePath: {
        type: String,
        required: true,
      },
      originalName: {
        type: String,
        required: true,
      },
      mimeType: {
        type: String,
        required: true,
      },
      size: {
        type: Number,
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'archived'],
      default: 'new',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PhotoCheckRequest', photoCheckRequestSchema);
