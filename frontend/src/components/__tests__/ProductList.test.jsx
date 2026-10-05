import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductList from '../ProductList';

const products = [
  {
    _id: 'lamp-1',
    title: 'Test Lithophane Lamp',
    slug: 'test-lithophane-lamp',
    sku: 'LITHCYL01',
    category: 'lamps',
    price: 50,
    image: '/images/test-lamp.jpg',
  },
  {
    _id: 'tool-1',
    title: 'Test Tool',
    slug: 'test-tool',
    sku: 'TOOL01',
    category: 'hardware',
    price: 25,
    image: '/images/test-tool.jpg',
  },
];

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => products,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('shows custom lamps before tools in the default storefront view', async () => {
  render(
    <MemoryRouter>
      <ProductList />
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.getByText('Test Lithophane Lamp')).toBeInTheDocument();
    expect(screen.getByText('Test Tool')).toBeInTheDocument();
  });

  const lampHeading = screen.getByRole('heading', {
    name: 'Custom Lamps & Prints',
  });
  const toolsHeading = screen.getByRole('heading', {
    name: 'Tools & Devices',
  });

  expect(
    lampHeading.compareDocumentPosition(toolsHeading) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
});
