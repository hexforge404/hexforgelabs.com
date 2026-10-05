export const getProductTrustIndicators = (product = {}) => {
  if (product.category === 'lamps') {
    return [
      { icon: '🔨', text: 'Handmade to order by HexForge Labs' },
      { icon: '💬', text: 'Direct support from the HexForge team' },
      { icon: '✓', text: 'Photo reviewed before production' },
    ];
  }

  return [
    { icon: '🔨', text: 'Built in-house by cybersecurity experts' },
    { icon: '💬', text: 'Direct support from the HexForge team' },
    { icon: '✓', text: 'Quality assured & tested' },
  ];
};

export const getProductNotice = (product = {}) => {
  if (product.category === 'lamps') {
    return {
      title: 'Custom Product Notice',
      text: 'Each lamp is made to order from your submitted photos. Image quality, cropping, and lighting can affect the finished lithophane, so HexForge Labs reviews submitted photos before production and will contact you if an image needs adjustment.',
    };
  }

  if (product.category === 'security' || product.category === 'hardware') {
    return {
      title: '⚠️ Important Notice',
      text: 'This product is intended for authorized security research, testing, and professional use only. Users are responsible for ensuring legal compliance with all applicable laws and regulations in their jurisdiction. Misuse or unauthorized access to systems is illegal.',
    };
  }

  return {
    title: '⚠️ Important Notice',
    text: 'Please ensure this product is used in accordance with applicable laws and regulations. We provide this product as-is and recommend thorough testing before production use.',
  };
};
