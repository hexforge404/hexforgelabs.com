const DIFFUSER_PRICE = 10;
const SIZE_PRICE_MAP = {
  small: 0,
  medium: 10,
  large: 20,
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
      base = 50 + sizeAdjustment;
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
