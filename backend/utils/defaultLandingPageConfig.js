const getDefaultLandingPageConfig = () => ({
  hero: {
    headline: 'Turn Your Favorite Photos Into Glowing Custom Lamps',
    subheadline: 'Handmade lithophane lamps and night lights created from your photos. Built for gifts, memorials, keepsakes, and one-of-a-kind home décor.',
    ctaText: 'Shop Custom Lamps',
    ctaLink: '/store',
    secondaryCtaText: 'Start a Custom Order',
    secondaryCtaLink: '/store/custom-lithophane-lamp-cylinder',
    imageUrl: '/images/products/litho-multipanel/hero-main.jpg',
    imageAlt: 'Multi-panel lithophane lamp glowing softly with a photo design',
  },
  announcement: {
    enabled: false,
    text: '',
    link: '',
  },
  featuredImages: [
    {
      imageUrl: '/images/products/litho-multipanel/hero-main.jpg',
      alt: 'Multi-panel lithophane lamp hero image',
      caption: 'Custom multi-panel glow',
      enabled: true,
      sortOrder: 0,
    },
    {
      imageUrl: '/images/products/litho-multipanel/hero-alt.jpg',
      alt: 'Alternate view of a multi-panel lithophane lamp',
      caption: 'Warm ambient lighting',
      enabled: true,
      sortOrder: 1,
    },
    {
      imageUrl: '/images/products/litho-multipanel/panel-1.jpg',
      alt: 'Close-up detail of lithophane panel',
      caption: 'Detailed lithophane panels',
      enabled: true,
      sortOrder: 2,
    },
    {
      imageUrl: '/images/products/litho-multipanel/panel-2.jpg',
      alt: 'Multi-panel lithophane lamp side view',
      caption: 'Multiple photo panels',
      enabled: true,
      sortOrder: 3,
    },
    {
      imageUrl: '/images/products/litho-cylinder/hero-main.jpg',
      alt: 'Cylinder lithophane lamp example',
      caption: 'Cylinder lamp example',
      enabled: true,
      sortOrder: 4,
    },
  ],
  reviews: [],
  featuredProductSlugs: [
    'custom-lithophane-lamp-cylinder',
    'multi-panel-lithophane-lamp',
    'lithophane-night-light',
  ],
  trustBadges: [
    {
      title: 'Handmade to order',
      description: 'Each lamp is crafted by hand from your photos.',
      icon: 'hand',
      enabled: true,
      sortOrder: 0,
    },
    {
      title: 'Designed from your photos',
      description: 'We use your images to create a glowing lithophane display.',
      icon: 'photo',
      enabled: true,
      sortOrder: 1,
    },
    {
      title: 'Free photo review',
      description: 'We check every photo for contrast, composition, and print quality.',
      icon: 'check-circle',
      enabled: true,
      sortOrder: 2,
    },
    {
      title: 'Secure checkout',
      description: 'Shop with confidence and a protected purchase process.',
      icon: 'lock',
      enabled: true,
      sortOrder: 3,
    },
  ],
  seo: {
    title: 'HexForge Labs | Custom Lithophane Lamps',
    description: 'Custom photo lamps and night lights handmade from your photos. Order a lithophane lamp, get a free photo review, and enjoy a glowing keepsake.',
  },
});

module.exports = { getDefaultLandingPageConfig };
