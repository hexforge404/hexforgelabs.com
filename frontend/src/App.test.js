import { render, screen, waitFor } from '@testing-library/react';
import { CartProvider } from 'context/CartContext';
import axios from 'axios';

jest.mock('axios', () => {
  const instance = { get: jest.fn(), post: jest.fn() };
  const create = jest.fn(() => instance);
  const defaultExport = { create, _instance: instance };
  return {
    __esModule: true,
    default: defaultExport,
    create,
    _instance: instance,
  };
});

jest.mock('lucide-react', () => new Proxy({}, {
  get: () => () => null,
}));

import App from './App';

describe('App with providers', () => {
  test('renders home when auth and member checks succeed', async () => {
    const api = axios._instance;

    api.get.mockImplementation((url) => {
      if (url === '/admin/session') return Promise.resolve({ data: { loggedIn: true } });
      if (url === '/users/me') return Promise.resolve({ data: { loggedIn: false } });
      return Promise.resolve({ data: {} });
    });
    api.post.mockResolvedValue({ data: {} });

    render(
      <CartProvider>
        <App />
      </CartProvider>
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/session'));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/users/me'));

    expect(screen.queryByText(/Authentication Check Failed/i)).not.toBeInTheDocument();
  });
});
