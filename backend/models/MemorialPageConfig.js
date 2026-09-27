const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  productSlug: { type: String, required: true, trim: true },
  title: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  bestFor: { type: String, default: '', trim: true },
  imageAlt: { type: String, default: '', trim: true },
  buttonText: { type: String, default: '', trim: true },
  buttonLink: { type: String, default: '', trim: true },
  statusText: { type: String, default: '', trim: true },
  availabilityOption: { type: String, default: '', trim: true }
}, { _id: false });

const memorialPageConfigSchema = new mongoose.Schema({
  hero: {
    eyebrow: { type: String, default: '', trim: true },
    headline: { type: String, default: '', trim: true },
    introPrimary: { type: String, default: '', trim: true },
    introSecondary: { type: String, default: '', trim: true },
    primaryCtaText: { type: String, default: '', trim: true },
    primaryCtaLink: { type: String, default: '', trim: true },
    secondaryCtaText: { type: String, default: '', trim: true },
    secondaryCtaLink: { type: String, default: '', trim: true },
    privacyText: { type: String, default: '', trim: true },
    imageUrl: { type: String, default: '', trim: true },
    imageAlt: { type: String, default: '', trim: true },
    imageCaption: { type: String, default: '', trim: true }
  },

  howItWorks: {
    heading: { type: String, default: '', trim: true },
    steps: [{ type: String, trim: true }]
  },

  packages: {
    heading: { type: String, default: '', trim: true },
    items: [packageSchema]
  },

  photoGuidance: {
    heading: { type: String, default: '', trim: true },
    body: { type: String, default: '', trim: true },
    tips: [{ type: String, trim: true }]
  },

  optionalKeepsake: {
    heading: { type: String, default: '', trim: true },
    body: { type: String, default: '', trim: true }
  },

  contact: {
    heading: { type: String, default: '', trim: true },
    bodyBeforeEmail: { type: String, default: '', trim: true },
    bodyAfterEmail: { type: String, default: '', trim: true }
  },

  seo: {
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true }
  }
}, {
  timestamps: true,
  strict: true
});

module.exports =
  mongoose.models.MemorialPageConfig ||
  mongoose.model('MemorialPageConfig', memorialPageConfigSchema);
