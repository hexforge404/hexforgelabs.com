import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MemorialPage from '../MemorialPage';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.reject(new Error('Use local defaults for focused Memorial test'))
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders the default Memorial hero image', () => {
  render(
    <MemoryRouter>
      <MemorialPage />
    </MemoryRouter>
  );

  const hero = screen.getByAltText(
    'Warm illuminated lithophane lamps displayed together'
  );

  expect(hero).toHaveAttribute(
    'src',
    '/images/products/litho-lamp/multi-lamp-2.jpg'
  );
});

test('falls back to the HexForge placeholder if the default hero fails', () => {
  render(
    <MemoryRouter>
      <MemorialPage />
    </MemoryRouter>
  );

  const hero = screen.getByAltText(
    'Warm illuminated lithophane lamps displayed together'
  );

  fireEvent.error(hero);

  expect(hero).toHaveAttribute(
    'src',
    '/images/hexforge-logo-removebg.png'
  );
});
