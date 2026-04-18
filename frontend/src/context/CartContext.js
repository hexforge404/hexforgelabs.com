import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();
const CART_STORAGE_KEY = 'hexforge_cart';

const safeParseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getCartKey = (item) => {
  return item._id || item.productId || item.slug || item.id || item.sku || item.name || 'unknown';
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      const parsed = safeParseJson(savedCart);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore localStorage write failures
    }
  }, [cart]);

  const addToCart = (product) => {
    const key = getCartKey(product);
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => getCartKey(item) === key);
      if (existingIndex >= 0) {
        const updated = [...prevCart];
        const existing = updated[existingIndex];
        updated[existingIndex] = {
          ...existing,
          quantity: Number(existing.quantity || 1) + 1,
        };
        return updated;
      }
      return [{ ...product, quantity: 1 }, ...prevCart];
    });
  };

  const removeFromCart = (product) => {
    const key = getCartKey(product);
    setCart((prevCart) => {
      const updated = prevCart.map((item) => {
        if (getCartKey(item) !== key) return item;
        const quantity = Number(item.quantity || 1) - 1;
        return quantity > 0 ? { ...item, quantity } : null;
      }).filter(Boolean);
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
