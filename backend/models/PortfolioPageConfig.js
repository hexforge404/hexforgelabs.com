const mongoose = require('mongoose');

const guidePromptSchema = new mongoose.Schema({
  label: { type: String, default: '', trim: true },
  response: { type: String, default: '', trim: true },
  includeEmail: { type: Boolean, default: false }
}, { _id: false });

const portfolioSectionSchema = new mongoose.Schema({
  title: { type: String, default: '', trim: true },
  items: [{ type: String, trim: true }]
}, { _id: false });

const portfolioPageConfigSchema = new mongoose.Schema({
  hero: {
    eyebrow: { type: String, default: '', trim: true },
    headline: { type: String, default: '', trim: true },
    subtitle: { type: String, default: '', trim: true },
    body: { type: String, default: '', trim: true }
  },

  guide: {
    title: { type: String, default: '', trim: true },
    intro: { type: String, default: '', trim: true },
    prompts: [guidePromptSchema]
  },

  sections: [portfolioSectionSchema],

  currentQueue: {
    heading: { type: String, default: '', trim: true },
    items: [{ type: String, trim: true }]
  },

  contact: {
    heading: { type: String, default: '', trim: true },
    name: { type: String, default: '', trim: true },
    location: { type: String, default: '', trim: true },
    helpButtonText: { type: String, default: '', trim: true }
  },

  contactForm: {
    heading: { type: String, default: '', trim: true }
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
  mongoose.models.PortfolioPageConfig ||
  mongoose.model('PortfolioPageConfig', portfolioPageConfigSchema);
