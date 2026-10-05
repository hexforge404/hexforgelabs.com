import {
  getProductNotice,
  getProductTrustIndicators,
} from '../productDetailContent';

test('uses handmade and photo-review messaging for lamps', () => {
  const product = { category: 'lamps' };

  expect(getProductTrustIndicators(product)).toEqual([
    { icon: '🔨', text: 'Handmade to order by HexForge Labs' },
    { icon: '💬', text: 'Direct support from the HexForge team' },
    { icon: '✓', text: 'Photo reviewed before production' },
  ]);

  expect(getProductNotice(product)).toEqual({
    title: 'Custom Product Notice',
    text: expect.stringContaining('reviews submitted photos before production'),
  });
});

test('preserves authorization messaging for security products', () => {
  const product = { category: 'security' };

  expect(getProductTrustIndicators(product)[0].text).toBe(
    'Built in-house by cybersecurity experts'
  );

  expect(getProductNotice(product)).toEqual({
    title: '⚠️ Important Notice',
    text: expect.stringContaining('authorized security research'),
  });
});

test('preserves the existing generic fallback for other products', () => {
  const product = { category: 'tools' };

  expect(getProductTrustIndicators(product)[0].text).toBe(
    'Built in-house by cybersecurity experts'
  );

  expect(getProductNotice(product)).toEqual({
    title: '⚠️ Important Notice',
    text: expect.stringContaining('applicable laws and regulations'),
  });
});
