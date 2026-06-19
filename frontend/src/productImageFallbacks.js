export const PRODUCT_IMAGE_FALLBACKS = {
  'usb-keylogger': '/images/key_logger.jpg',
  'blackarch-linux-usb': '/images/kali_usb.jpg',
  'arch-linux-usb': '/images/kali_usb.jpg',
  'kali-linux-usb': '/images/kali_usb.jpg',
  'parrot-security-os-usb': '/images/kali_usb.jpg',
  'htb-hack-the-box-os-usb': '/images/kali_usb.jpg',
  'qubes-os-usb': '/images/kali_usb.jpg',
  'custom-family-lithophane-bundle':
    '/images/products/litho-lamp/multi-lamp-2.jpg',
  'lithophane-night-light':
    '/images/products/litho-lamp/IMG_20260401_184103254_HDR.jpg',
  'lithophane-diffuser-insert':
    '/images/products/litho-box/glow-close.jpg',
  'lithophane-globe-lamp':
    '/images/products/litho-lamp/hero-main.jpg',
  'custom-lithophane-lamp-cylinder':
    '/images/products/litho-cylinder/hero-main.jpg',
  'multi-panel-lithophane-lamp': '/images/products/litho-multipanel/hero-main.jpg',
  'lithophane-box': '/images/products/litho-box/hero-main.jpg',
  'five-sided-lithophane-panel-box': '/images/products/litho-box/angle-1.jpg',
};

const normalizeProductKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const PRODUCT_IMAGE_ALIASES = {
  'cylinder-memorial-photo-lamp': 'custom-lithophane-lamp-cylinder',
  'four-sided-lithophane-box': 'lithophane-box',
  'multi-panel-memorial-lamp': 'multi-panel-lithophane-lamp',
  'memorial-globe-lamp': 'lithophane-globe-lamp',
  'family-keepsake-bundle': 'custom-family-lithophane-bundle',
};

const getProductKeys = (productOrSlug) => {
  if (!productOrSlug) return [];
  if (typeof productOrSlug === 'string') return [normalizeProductKey(productOrSlug)];
  return [productOrSlug.slug, productOrSlug.title, productOrSlug.name]
    .map(normalizeProductKey)
    .filter(Boolean);
};

export const getProductImageFallback = (productOrSlug) => {
  const keys = getProductKeys(productOrSlug);
  for (const key of keys) {
    const canonicalKey = PRODUCT_IMAGE_ALIASES[key] || key;
    if (PRODUCT_IMAGE_FALLBACKS[canonicalKey]) {
      return PRODUCT_IMAGE_FALLBACKS[canonicalKey];
    }
  }
  return '';
};

export const getFirstImageValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(getFirstImageValue).find(Boolean) || '';
  }
  if (typeof value === 'object') {
    return (
      value.url ||
      value.src ||
      value.path ||
      value.publicUrl ||
      value.hero_image_url ||
      value.image ||
      ''
    );
  }
  return '';
};

export const getProductImage = (product) => {
  const gallery = Array.isArray(product?.imageGallery)
    ? product.imageGallery.map(getFirstImageValue).filter(Boolean)
    : [];

  return (
    getFirstImageValue(product?.hero_image_url) ||
    getFirstImageValue(product?.image) ||
    getFirstImageValue(product?.imageUrl) ||
    getFirstImageValue(product?.thumbnail) ||
    getFirstImageValue(product?.images) ||
    getFirstImageValue(product?.media) ||
    getFirstImageValue(product?.productImages) ||
    gallery[0] ||
    getProductImageFallback(product)
  );
};
