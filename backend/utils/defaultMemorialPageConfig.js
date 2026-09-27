const getDefaultMemorialPageConfig = () => ({
  hero: {
    eyebrow: 'HexForge Labs | Memorial Photo Keepsakes',
    headline: 'Turn a meaningful photo into a warm memorial light',
    introPrimary:
      'A custom memorial lithophane lamp is made from a photo you choose. When the lamp is lit, the image becomes visible through the printed shade, creating a quiet illuminated keepsake for home display, remembrance tables, or close family gifts.',
    introSecondary:
      'Send a photo, tell us what you have in mind, and HexForge Labs will review what will work best before the keepsake is made.',
    primaryCtaText: 'Start a Memorial Keepsake Request',
    primaryCtaLink: '/store/custom-lithophane-lamp-cylinder',
    secondaryCtaText: 'View Keepsake Packages',
    secondaryCtaLink: '#keepsake-packages',
    privacyText:
      'Family photos are handled respectfully and are not used for public display without permission.',
    imageUrl: '/images/products/litho-lamp/multi-lamp-2.jpg',
    imageAlt: 'Warm illuminated lithophane lamps displayed together',
    imageCaption: 'A family photo becomes visible when the keepsake is illuminated.'
  },

  howItWorks: {
    heading: 'How it works',
    steps: [
      'Choose the keepsake style or package that fits your family.',
      'Send your photo or photos with any notes about the person or memory.',
      'HexForge Labs reviews the image and confirms what will work best.',
      'Your memorial keepsake is created, checked, and prepared for delivery or pickup.'
    ]
  },

  packages: {
    heading: 'Memorial keepsake options',
    items: [
      {
        productSlug: 'custom-lithophane-lamp-cylinder',
        title: 'Cylinder Memorial Photo Lamp',
        description:
          'A custom cylindrical lithophane lamp made from one selected memorial photo. When lit from inside, the image becomes a warm illuminated keepsake.',
        bestFor: 'One primary memorial photo or portrait',
        imageAlt: 'Illuminated cylindrical lithophane lamp',
        buttonText: 'View Cylinder Lamp',
        buttonLink: '/store/custom-lithophane-lamp-cylinder',
        statusText: '',
        availabilityOption: ''
      },
      {
        productSlug: 'lithophane-box',
        title: 'Four-Sided Lithophane Box',
        description:
          'A four-sided photo box that glows from within using an LED tea light or e-tealight. Designed for a shelf, table, or remembrance space.',
        bestFor: 'Small memorial displays, gift pieces, or candle-style remembrance',
        imageAlt: 'Four-sided illuminated lithophane box',
        buttonText: 'View Four-Sided Box',
        buttonLink: '/store/lithophane-box',
        statusText: '',
        availabilityOption: ''
      },
      {
        productSlug: 'five-sided-lithophane-panel-box',
        title: 'Five-Sided Lithophane Panel Box',
        description:
          'A premium five-sided box concept with removable colored lithophane panels.',
        bestFor: 'Future premium custom-panel keepsake displays',
        imageAlt: 'Lithophane panel box concept',
        buttonText: 'Ask About Availability',
        buttonLink: '',
        statusText: 'Coming Soon',
        availabilityOption: 'Five-Sided Lithophane Panel Box'
      },
      {
        productSlug: 'multi-panel-lithophane-lamp',
        title: 'Multi-Panel Lithophane Lamp',
        description:
          'A full lamp shade made with multiple lithophane panels. Each lamp can include up to five panels or photos.',
        bestFor: 'Several photos in one larger lamp or family memorial display',
        imageAlt: 'Full multi-panel lithophane lamp shade',
        buttonText: 'View Multi-Panel Lamp',
        buttonLink: '/store/multi-panel-lithophane-lamp',
        statusText: '',
        availabilityOption: ''
      },
      {
        productSlug: 'lithophane-globe-lamp',
        title: 'Memorial Globe Lamp',
        description:
          'A globe-style illuminated photo keepsake option for families who want a decorative memorial piece.',
        bestFor: 'Decorative home display or a distinctive memorial lamp',
        imageAlt: 'Globe-style illuminated lithophane keepsake',
        buttonText: 'View Globe Lamp',
        buttonLink: '/store/lithophane-globe-lamp',
        statusText: '',
        availabilityOption: ''
      },
      {
        productSlug: 'custom-family-lithophane-bundle',
        title: 'Family Keepsake Bundle',
        description:
          'A coordinated family bundle with matching illuminated keepsakes made from a shared photo set.',
        bestFor: 'Close relatives or several remembrance displays',
        imageAlt: 'Coordinated family lithophane keepsake bundle',
        buttonText: 'View Family Bundle',
        buttonLink: '/store/custom-family-lithophane-bundle',
        statusText: '',
        availabilityOption: ''
      }
    ]
  },

  photoGuidance: {
    heading: 'Photo guidance',
    body:
      'Most clear, well-lit photos can be reviewed for use. If a photo is older, faded, cropped, or low-resolution, HexForge Labs will review it and explain what is possible before moving forward.',
    tips: [
      'Phone photos, scanned photos, and older family images may be reviewed.',
      'Higher contrast and clear faces usually work best.',
      'We will explain what is possible before your keepsake moves into production.'
    ]
  },

  optionalKeepsake: {
    heading: 'A respectful optional keepsake',
    body:
      'These memorial keepsakes are optional personal items. They are not meant to replace flowers, printed materials, urns, or existing funeral home services. They are simply one way for a family to preserve a photo memory in a warm, physical form.'
  },

  contact: {
    heading: 'Start a request',
    bodyBeforeEmail: 'If the request buttons do not work for you, email',
    bodyAfterEmail:
      'with your name, the keepsake option you are interested in, and whether you already have a photo selected.'
  },

  seo: {
    title: 'Memorial Photo Keepsakes | HexForge Labs',
    description:
      'Custom photo memorial lithophane lamps and illuminated keepsakes from HexForge Labs.'
  }
});

module.exports = { getDefaultMemorialPageConfig };
