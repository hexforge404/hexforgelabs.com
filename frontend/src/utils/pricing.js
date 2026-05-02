export const LAMP_SHADE_SIZES = {
  small: {
    label: 'Small',
    topDiameterMm: 100,
    bottomDiameterMm: 150,
    heightMm: 150,
    includedPanels: 2,
    basePrice: 45,
  },
  medium: {
    label: 'Medium',
    topDiameterMm: 150,
    bottomDiameterMm: 200,
    heightMm: 200,
    includedPanels: 2,
    basePrice: 60,
  },
  large: {
    label: 'Large',
    topDiameterMm: 200,
    bottomDiameterMm: 250,
    heightMm: 250,
    includedPanels: 2,
    basePrice: 75,
  },
};

export const LAMP_ADDONS = {
  extraPanel: 5,
  diffuser: 10,
  rgbLighting: 15,
  rgbDiffuserBundle: 20,
};

export const DEPOSIT_RATE = 0.5;

const isLampShadeProduct = (productType) => {
  return ['cylinder', 'panel', 'globeLamp'].includes(String(productType).trim());
};

const getSizeConfig = (size) => {
  return LAMP_SHADE_SIZES[String(size).toLowerCase()] || LAMP_SHADE_SIZES.medium;
};

export function calculatePrice({ productType, panelCount = 2, size = 'medium', addons = {}, lightType } = {}) {
  let base = 0;
  const count = Number(panelCount) || 2;
  const sizeConfig = getSizeConfig(size);

  if (productType === 'cylinder') {
    base = sizeConfig.basePrice;
    base += Math.max(0, count - sizeConfig.includedPanels) * LAMP_ADDONS.extraPanel;
  } else if (productType === 'panel') {
    base = sizeConfig.basePrice;
    base += Math.max(0, count - sizeConfig.includedPanels) * LAMP_ADDONS.extraPanel;
  } else if (productType === 'globeLamp') {
    base = sizeConfig.basePrice;
  } else if (productType === 'fixedBox4') {
    base = 45;
  } else if (productType === 'panelBox5' || productType === 'swappableBox5') {
    base = 55;
  } else if (productType === 'familyBundle4') {
    base = 129.99;
  } else if (productType === 'nightlight') {
    base = 10;
  }

  if (isLampShadeProduct(productType)) {
    const hasRgb = String(lightType || '').toLowerCase() === 'rgb' || addons.rgbLighting || addons.rgb;
    const hasDiffuser = Boolean(addons.diffuser);

    if (hasRgb && hasDiffuser) {
      base += LAMP_ADDONS.rgbDiffuserBundle;
    } else if (hasRgb) {
      base += LAMP_ADDONS.rgbLighting;
    } else if (hasDiffuser) {
      base += LAMP_ADDONS.diffuser;
    }
  }

  if (addons.nightlight) {
    base += 5;
  }

  return base;
}
