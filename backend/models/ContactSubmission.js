const mongoose = require('mongoose');

const allowedPageSources = ['portfolio', 'help', 'general'];

const contactSubmissionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  topic: { type: String, trim: true },
  message: { type: String, required: true, trim: true },
  pageSource: {
    type: String,
    enum: allowedPageSources,
    default: 'general'
  },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'archived'],
    default: 'new'
  },
  userAgent: { type: String },
  ipHash: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
