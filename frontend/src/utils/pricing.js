const DIFFUSER_PRICE = 10;
const SIZE_PRICE_MAP = {
  small: 0,
  medium: 10,
  large: 20,
};

const CUSTOM_PRODUCT_TYPE_BY_SKU = {
  LITHCYL01: 'cylinder',
  LITHMUL02: 'panel',
  LITHBOX03: 'fixedBox4',
  LITHBOX05: 'panelBox5',
  LITHGLB04: 'globeLamp',
  LITHBUNDLE01: 'familyBundle4',
  LITHNL01: 'nightlight',
};

export function calculatePrice({ productType, panelCount = 2, size = 'small', addons = {} } = {}) {
  let base = 0;
  const count = Number(panelCount) || 2;
  const sizeAdjustment = SIZE_PRICE_MAP[String(size).toLowerCase()] || 0;

  switch (productType) {
    case 'cylinder':
      base = 35 + sizeAdjustment;
      base += Math.max(0, count - 2) * 10;
      break;
    case 'panel':
      base = 55 + sizeAdjustment;
      base += Math.max(0, count - 2) * 10;
      break;
    case 'globeLamp':
      base = 50 + sizeAdjustment;
      break;
    case 'fixedBox4':
      base = 45;
      break;
    case 'panelBox5':
    case 'swappableBox5':
      base = 55;
      break;
    case 'familyBundle4':
      base = 129.99;
      break;
    case 'nightlight':
      base = 10;
      break;
    default:
      base = 0;
  }

  if (addons.diffuser) base += DIFFUSER_PRICE;
  if (addons.nightlight) base += 5;

  return base;
}

export function formatPrice(value, fallback = '$0.00') {
  const price = Number(value);
  return Number.isFinite(price) ? `$${price.toFixed(2)}` : fallback;
}

export function getCustomProductType(productOrSku) {
  const sku = typeof productOrSku === 'string'
    ? productOrSku
    : productOrSku?.sku;
  return CUSTOM_PRODUCT_TYPE_BY_SKU[String(sku || '').toUpperCase()] || null;
}

export function getProductStartingPrice(product, fallbackPrice = product?.price) {
  const productType = getCustomProductType(product);

  if (!productType) {
    const price = Number(fallbackPrice);
    return Number.isFinite(price) ? price : null;
  }

  if (productType === 'cylinder') {
    return calculatePrice({ productType, panelCount: 2, size: 'small' });
  }

  if (productType === 'panel') {
    return calculatePrice({ productType, panelCount: 2, size: 'small' });
  }

  if (productType === 'globeLamp') {
    return calculatePrice({ productType, size: 'small' });
  }

  return calculatePrice({ productType });
}
