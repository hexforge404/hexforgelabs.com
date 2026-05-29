const express = require('express');
const router = express.Router();
const LandingPageConfig = require('../models/LandingPageConfig');
const { getDefaultLandingPageConfig } = require('../utils/defaultLandingPageConfig');

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

module.exports = router;
