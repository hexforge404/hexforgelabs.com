const express = require('express');
const router = express.Router();
const LandingPageConfig = require('../models/LandingPageConfig');
const { getDefaultLandingPageConfig } = require('../utils/defaultLandingPageConfig');
const FuneralHomePageConfig = require('../models/FuneralHomePageConfig');
const { getDefaultFuneralHomePageConfig } = require('../utils/defaultFuneralHomePageConfig');
const MemorialPageConfig = require('../models/MemorialPageConfig');
const { getDefaultMemorialPageConfig } = require('../utils/defaultMemorialPageConfig');

const buildConfig = (doc) => {
  const defaultConfig = getDefaultLandingPageConfig();
  const data = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc || {};

  return {
    hero: {
      ...defaultConfig.hero,
      ...(data.hero || {}),
    },
    announcement: {
      ...defaultConfig.announcement,
      ...(data.announcement || {}),
    },
    featuredImages: Array.isArray(data.featuredImages) && data.featuredImages.length
      ? data.featuredImages
      : defaultConfig.featuredImages,
    reviews: Array.isArray(data.reviews) ? data.reviews : defaultConfig.reviews,
    featuredProductSlugs: Array.isArray(data.featuredProductSlugs) && data.featuredProductSlugs.length
      ? data.featuredProductSlugs
      : defaultConfig.featuredProductSlugs,
    trustBadges: Array.isArray(data.trustBadges) && data.trustBadges.length
      ? data.trustBadges
      : defaultConfig.trustBadges,
    seo: {
      ...defaultConfig.seo,
      ...(data.seo || {}),
    },
  };
};

router.get('/', async (req, res) => {
  try {
    const config = await LandingPageConfig.findOne().lean();
    return res.json({ success: true, config: buildConfig(config) });
  } catch (err) {
    console.error('Failed to load landing page config:', err);
    return res.status(500).json({ success: false, error: 'Failed to load landing page config' });
  }
});

const buildFuneralHomeConfig = (doc) => {
  const defaults = getDefaultFuneralHomePageConfig();
  const data = doc || {};

  return {
    hero: { ...defaults.hero, ...(data.hero || {}) },
    referral: { ...defaults.referral, ...(data.referral || {}) },
    familyReceives: {
      ...defaults.familyReceives,
      ...(data.familyReceives || {}),
      cards: Array.isArray(data.familyReceives?.cards) && data.familyReceives.cards.length
        ? data.familyReceives.cards
        : defaults.familyReceives.cards,
    },
    referralSteps: {
      ...defaults.referralSteps,
      ...(data.referralSteps || {}),
      steps: Array.isArray(data.referralSteps?.steps) && data.referralSteps.steps.length
        ? data.referralSteps.steps
        : defaults.referralSteps.steps,
    },
    directorSample: { ...defaults.directorSample, ...(data.directorSample || {}) },
    contact: { ...defaults.contact, ...(data.contact || {}) },
    seo: { ...defaults.seo, ...(data.seo || {}) },
  };
};

router.get('/funeral-home', async (req, res) => {
  try {
    const config = await FuneralHomePageConfig.findOne().lean();
    return res.json({
      success: true,
      config: buildFuneralHomeConfig(config),
    });
  } catch (err) {
    console.error('Failed to load funeral home page config:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to load funeral home page config',
    });
  }
});

const buildMemorialConfig = (doc) => {
  const defaults = getDefaultMemorialPageConfig();
  const data = doc || {};
  const storedItems = Array.isArray(data.packages?.items)
    ? data.packages.items
    : [];

  return {
    hero: { ...defaults.hero, ...(data.hero || {}) },

    howItWorks: {
      ...defaults.howItWorks,
      ...(data.howItWorks || {}),
      steps: Array.isArray(data.howItWorks?.steps) && data.howItWorks.steps.length
        ? data.howItWorks.steps
        : defaults.howItWorks.steps,
    },

    packages: {
      ...defaults.packages,
      ...(data.packages || {}),
      items: defaults.packages.items.map((defaultItem, index) => ({
        ...defaultItem,
        ...(storedItems[index] || {}),
        productSlug: defaultItem.productSlug,
        availabilityOption: defaultItem.availabilityOption,
      })),
    },

    photoGuidance: {
      ...defaults.photoGuidance,
      ...(data.photoGuidance || {}),
      tips: Array.isArray(data.photoGuidance?.tips) && data.photoGuidance.tips.length
        ? data.photoGuidance.tips
        : defaults.photoGuidance.tips,
    },

    optionalKeepsake: {
      ...defaults.optionalKeepsake,
      ...(data.optionalKeepsake || {}),
    },

    contact: { ...defaults.contact, ...(data.contact || {}) },
    seo: { ...defaults.seo, ...(data.seo || {}) },
  };
};

router.get('/memorial', async (req, res) => {
  try {
    const config = await MemorialPageConfig.findOne().lean();
    return res.json({
      success: true,
      config: buildMemorialConfig(config),
    });
  } catch (err) {
    console.error('Failed to load memorial page config:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to load memorial page config',
    });
  }
});

const LandingPage = require('../models/LandingPage');

router.get('/pages/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }
    const page = await LandingPage.findOne({ slug, status: 'published' }).lean();
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
    return res.json({ success: true, page });
  } catch (err) {
    console.error('Failed to load landing page:', err);
    return res.status(500).json({ success: false, error: 'Failed to load landing page' });
  }
});

module.exports = router;
