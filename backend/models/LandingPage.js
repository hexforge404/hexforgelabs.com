const mongoose = require('mongoose');

const landingPageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  title: { type: String, required: true, trim: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  eyebrow: { type: String, trim: true, default: '' },
  headline: { type: String, trim: true, default: '' },
  introduction: { type: String, trim: true, default: '' },
  heroImage: { type: String, trim: true, default: '' },
  heroAlt: { type: String, trim: true, default: '' },
  heroConcept: { type: Boolean, default: false },
  primaryCtaText: { type: String, trim: true, default: '' },
  primaryCtaLink: { type: String, trim: true, default: '' },
  sections: [{
    heading: { type: String, trim: true, default: '' },
    body: { type: String, trim: true, default: '' },
  }],
  images: [{
    url: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, default: '' },
    caption: { type: String, trim: true, default: '' },
    concept: { type: Boolean, default: false },
  }],
  seo: {
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
  },
}, { timestamps: true });

module.exports = mongoose.model('LandingPage', landingPageSchema);
