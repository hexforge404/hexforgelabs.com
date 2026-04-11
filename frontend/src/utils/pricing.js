export function calculatePrice({ productType, panelCount = 2, addons = {} } = {}) {
  let base = 0;
  const count = Number(panelCount) || 2;

  switch (productType) {
    case 'cylinder':
    case 'panel':
      base = 50;
      base += Math.max(0, count - 2) * 10;
      break;
    case 'fixedBox4':
      base = 60;
      break;
    case 'swappableBox5':
      base = 75;
      break;
    default:
      base = 0;
  }

  if (addons.nightlight) base += 5;
  if (addons.globe) base += 10;

  return base;
}
