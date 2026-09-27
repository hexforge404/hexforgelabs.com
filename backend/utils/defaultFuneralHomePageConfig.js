const getDefaultFuneralHomePageConfig = () => ({
  hero: {
    eyebrow: 'HexForge Labs | Funeral Home Memorial Keepsake Option',
    headline: 'A simple photo keepsake option for families who ask for something personal',
    introPrimary: 'HexForge Labs creates custom photo-based memorial lithophane lamps from family-submitted photographs. When lit from inside, the image becomes a soft illuminated portrait or memory scene families can display at home, place on a remembrance table when appropriate, or give to close relatives after a service.',
    introSecondary: 'Families work directly with HexForge Labs for photo review, ordering, payment, and fulfillment. Your team can simply share the information sheet or QR code when a family asks about personalized keepsakes.',
    primaryCtaText: 'Request Funeral Home Info Packet',
    primaryCtaSubject: 'Funeral Home Info Packet Request',
    secondaryCtaText: 'View Family Memorial Page',
    secondaryCtaLink: '/memorial',
    imageUrl: '/images/products/litho-lamp/multi-lamp-2.jpg',
    imageAlt: 'A group of illuminated custom lithophane lamps',
    imageCaptionTitle: 'Memorial lithophane lamp preview',
    imageCaptionText: 'Custom photo keepsakes illuminated from within.',
  },

  referral: {
    heading: 'A simple referral path for families who ask about keepsakes',
    body: 'Funeral homes may share an information sheet or QR code with families who ask about personalized memorial keepsakes. Families contact and order directly through HexForge Labs, so your team does not need to manage inventory, collect photos, process payments, or add another formal vendor program before there is proven interest.',
    callout: 'No inventory, photo collection, payment processing, or fulfillment work is required from your team.',
  },

  familyReceives: {
    heading: 'What families receive',
    cards: [
      {
        title: 'Custom photo lamp',
        body: 'A family-selected photograph becomes a warm illuminated portrait or memory scene.',
      },
      {
        title: 'Photo review guidance',
        body: 'HexForge Labs reviews the image and explains what will reproduce clearly before production.',
      },
      {
        title: 'Direct order with HexForge Labs',
        body: 'Families handle order details, payment, delivery, or pickup directly with HexForge Labs.',
      },
    ],
    privacyText: 'Family photos are handled privately and are not used publicly without permission.',
  },

  referralSteps: {
    heading: 'How the referral path works',
    steps: [
      'A funeral home shares the QR code or information sheet when a family asks about personalized keepsakes.',
      'The family reviews options and contacts HexForge Labs directly.',
      'HexForge Labs handles photo guidance, order details, payment, and fulfillment.',
      'The funeral home can request a sample or discuss a display arrangement later if there is interest.',
    ],
  },

  directorSample: {
    heading: 'Optional director sample',
    body: 'Limited director samples can be discussed after your team reviews the information packet, especially if you want to experience the same photo review and keepsake process a family would receive.',
  },

  contact: {
    heading: 'Contact our team',
    bodyBeforeEmail: 'For funeral home programs, information packets, sample questions, or display discussions, contact HexForge Labs at',
    bodyAfterEmail: 'Calls or in-person visits are available by appointment.',
  },

  seo: {
    title: 'Funeral Home Memorial Keepsakes | HexForge Labs',
    description: 'Information for funeral homes about optional custom photo memorial lithophane keepsakes from HexForge Labs.',
  },
});

module.exports = { getDefaultFuneralHomePageConfig };
