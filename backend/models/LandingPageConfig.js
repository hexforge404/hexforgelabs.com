const mongoose = require('mongoose');

const landingPageConfigSchema = new mongoose.Schema(
  {
    hero: {
      headline: { type: String, trim: true, default: '' },
      subheadline: { type: String, trim: true, default: '' },
      ctaText: { type: String, trim: true, default: '' },
      ctaLink: { type: String, trim: true, default: '' },
      secondaryCtaText: { type: String, trim: true, default: '' },
      secondaryCtaLink: { type: String, trim: true, default: '' },
      imageUrl: { type: String, trim: true, default: '' },
      imageAlt: { type: String, trim: true, default: '' },
    },
    announcement: {
      enabled: { type: Boolean, default: false },
      text: { type: String, trim: true, default: '' },
      link: { type: String, trim: true, default: '' },
    },
    featuredImages: {
      type: [
        {
          imageUrl: { type: String, trim: true, default: '' },
          alt: { type: String, trim: true, default: '' },
          caption: { type: String, trim: true, default: '' },
          enabled: { type: Boolean, default: true },
          sortOrder: { type: Number, default: 0 },
        }
      ],
      default: [],
    },
    reviews: {
      type: [
        {
          name: { type: String, trim: true, default: '' },
          text: { type: String, trim: true, default: '' },
          rating: { type: Number, default: 0, min: 0, max: 5 },
          imageUrl: { type: String, trim: true, default: '' },
          enabled: { type: Boolean, default: true },
          sortOrder: { type: Number, default: 0 },
        }
      ],
      default: [],
    },
    featuredProductSlugs: {
      type: [String],
      default: [],
      set: (values = []) =>
        (Array.isArray(values) ? values : [values])
          .map((value) => String(value || '').trim())
          .filter(Boolean),
    },
    trustBadges: {
      type: [
        {
          title: { type: String, trim: true, default: '' },
          description: { type: String, trim: true, default: '' },
          icon: { type: String, trim: true, default: '' },
          enabled: { type: Boolean, default: true },
          sortOrder: { type: Number, default: 0 },
        }
      ],
      default: [],
    },
    seo: {
      title: { type: String, trim: true, default: '' },
      description: { type: String, trim: true, default: '' },
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

module.exports = mongoose.model('LandingPageConfig', landingPageConfigSchema);
