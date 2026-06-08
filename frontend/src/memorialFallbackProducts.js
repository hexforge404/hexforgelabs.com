export const memorialFallbackProducts = [
  {
    _id: 'fallback-lithophane-cylinder',
    isMemorialFallback: true,
    title: 'Cylinder Memorial Photo Lamp',
    slug: 'custom-lithophane-lamp-cylinder',
    sku: 'LITHCYL01',
    description:
      'A custom cylindrical lithophane lamp made from a selected photo. When lit from inside, the image becomes a warm illuminated keepsake.',
    price: 35,
    status: 'active',
    stock: 10,
    category: 'lamps',
    hero_image_url: '/images/products/litho-cylinder/hero-main.jpg',
    imageGallery: [
      '/images/products/litho-cylinder/hero-main.jpg',
      '/images/products/litho-cylinder/hero-alt.jpg',
      '/images/products/litho-cylinder/panel-1.jpg'
    ]
  },
  {
    _id: 'fallback-lithophane-box',
    isMemorialFallback: true,
    title: 'Four-Sided Lithophane Box',
    slug: 'lithophane-box',
    sku: 'LITHBOX03',
    description:
      'A four-sided photo box that glows from within using an LED tea light or e-tealight. Designed for a shelf, table, or remembrance space.',
    price: 45,
    status: 'active',
    stock: 10,
    category: 'lamps',
    hero_image_url: '/images/products/litho-box/hero-main.jpg',
    imageGallery: [
      '/images/products/litho-box/hero-main.jpg',
      '/images/products/litho-box/glow-close.jpg',
      '/images/products/litho-box/angle-1.jpg'
    ]
  },
  {
    _id: 'fallback-multi-panel-lamp',
    isMemorialFallback: true,
    title: 'Multi-Panel Lithophane Lamp',
    slug: 'multi-panel-lithophane-lamp',
    sku: 'LITHMUL02',
    description:
      'A full lamp shade made with multiple lithophane panels. Each lamp can include up to five panels or photos.',
    price: 50,
    status: 'active',
    stock: 10,
    category: 'lamps',
    hero_image_url: '/images/products/litho-multipanel/hero-main.jpg',
    imageGallery: [
      '/images/products/litho-multipanel/hero-main.jpg',
      '/images/products/litho-multipanel/hero-alt.jpg',
      '/images/products/litho-multipanel/panel-1.jpg'
    ]
  },
  {
    _id: 'fallback-globe-lamp',
    isMemorialFallback: true,
    title: 'Memorial Globe Lamp',
    slug: 'lithophane-globe-lamp',
    sku: 'LITHGLB04',
    description:
      'A globe-style illuminated photo keepsake for families who want a distinctive decorative memorial piece.',
    price: 50,
    status: 'active',
    stock: 10,
    category: 'lamps',
    hero_image_url: '/images/products/litho-lamp/hero-main.jpg',
    imageGallery: [
      '/images/products/litho-lamp/hero-main.jpg',
      '/images/products/litho-lamp/hero-alt.jpg',
      '/images/products/litho-lamp/glow-close.jpg'
    ]
  }
];

export const getMemorialFallbackProduct = (slug) =>
  memorialFallbackProducts.find((product) => product.slug === slug) || null;

export const memorialProductContent = {
  'custom-lithophane-lamp-cylinder': {
    highlights: [
      'Cylindrical lamp made from a selected photo',
      'Warm illuminated portrait when lit',
      'Photo review before production',
      'Handcrafted to order'
    ],
    useCases: ['One primary memorial photo', 'Portrait keepsakes', 'Home display', 'Remembrance tables'],
    whatsIncluded: ['Custom cylinder lithophane lamp', 'Photo review and print prep', 'Protective packaging'],
    description:
      'A custom cylindrical lithophane lamp made from one selected memorial photo. When lit from inside, the image becomes visible as a warm illuminated keepsake.',
    batchNote: 'Handcrafted | Made to order'
  },
  'lithophane-box': {
    highlights: [
      'Four-sided photo light',
      'LED tea light / e-tealight illumination',
      'Designed for shelves and remembrance spaces',
      'Handcrafted from family photos'
    ],
    useCases: ['Small memorial displays', 'Gift pieces', 'Tabletop remembrance', 'Candle-style remembrance'],
    whatsIncluded: ['Four-sided lithophane photo box', 'LED tea light format', 'Photo review and print prep'],
    description:
      'A four-sided photo box that glows from within using an LED tea light or e-tealight. Designed for a shelf, table, or remembrance space.',
    batchNote: 'Handcrafted | Made to order'
  },
  'multi-panel-lithophane-lamp': {
    highlights: [
      'Full lamp shade made from multiple panels',
      'Up to five panels or photos',
      'Designed for a compatible lamp base',
      'Handcrafted to order'
    ],
    useCases: ['Several photos in one lamp', 'Family memorial displays', 'Home lighting', 'Shared memories'],
    whatsIncluded: ['Custom multi-panel lamp shade', 'Photo review and panel prep', 'Protective packaging'],
    description:
      'A full lamp shade made with multiple lithophane panels. Each multi-panel lamp can include up to five panels or photos.',
    batchNote: 'Handcrafted | Made to order'
  },
  'lithophane-globe-lamp': {
    highlights: [
      'Globe-style illuminated keepsake',
      'Made from family-selected photos',
      'Decorative ambient display',
      'Photo review before production'
    ],
    useCases: ['Decorative home display', 'Distinctive memorial lamps', 'Family keepsakes', 'Remembrance spaces'],
    whatsIncluded: ['Custom memorial globe lamp', 'Photo review and print prep', 'Protective packaging'],
    description:
      'A globe-style illuminated photo keepsake option for families who want a decorative memorial piece.',
    batchNote: 'Handcrafted | Made to order'
  }
};

export const getMemorialProductContent = (slug) => memorialProductContent[slug] || null;
