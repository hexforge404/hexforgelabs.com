const mongoose = require('mongoose');

const funeralHomePageConfigSchema = new mongoose.Schema(
  {
    hero: {
      eyebrow: { type: String, trim: true, default: '' },
      headline: { type: String, trim: true, default: '' },
      introPrimary: { type: String, trim: true, default: '' },
      introSecondary: { type: String, trim: true, default: '' },
      primaryCtaText: { type: String, trim: true, default: '' },
      primaryCtaSubject: { type: String, trim: true, default: '' },
      secondaryCtaText: { type: String, trim: true, default: '' },
      secondaryCtaLink: { type: String, trim: true, default: '' },
      imageUrl: { type: String, trim: true, default: '' },
      imageAlt: { type: String, trim: true, default: '' },
      imageCaptionTitle: { type: String, trim: true, default: '' },
      imageCaptionText: { type: String, trim: true, default: '' },
    },

    referral: {
      heading: { type: String, trim: true, default: '' },
      body: { type: String, trim: true, default: '' },
      callout: { type: String, trim: true, default: '' },
    },

    familyReceives: {
      heading: { type: String, trim: true, default: '' },
      cards: {
        type: [
          {
            title: { type: String, trim: true, default: '' },
            body: { type: String, trim: true, default: '' },
          }
        ],
        default: [],
      },
      privacyText: { type: String, trim: true, default: '' },
    },

    referralSteps: {
      heading: { type: String, trim: true, default: '' },
      steps: { type: [String], default: [] },
    },

    directorSample: {
      heading: { type: String, trim: true, default: '' },
      body: { type: String, trim: true, default: '' },
    },

    contact: {
      heading: { type: String, trim: true, default: '' },
      bodyBeforeEmail: { type: String, trim: true, default: '' },
      bodyAfterEmail: { type: String, trim: true, default: '' },
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

module.exports = mongoose.model('FuneralHomePageConfig', funeralHomePageConfigSchema);
