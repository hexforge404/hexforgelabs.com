import React, { useState } from 'react';
import { useCart } from 'context/CartContext';
import '../pages/AdminPage.css';
import API_BASE_URL from '../utils/apiBase';
import { successToast, errorToast, warningToast, infoToast } from '../utils/toastUtils';
import './CartDrawer.css';
import 'react-toastify/dist/ReactToastify.css';

function CartDrawer({ isOpen, onClose }) {
  const { cart, removeFromCart, clearCart } = useCart();
  const total = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    if (cart.length === 0) {
      warningToast('⚠️ Your cart is empty!', { position: 'top-right' });
      return;
    }

    setCheckoutLoading(true);
    try {
      const sanitizedItems = cart.map((item) => ({
        _id: item._id,
        productId: item.productId,
        slug: item.slug,
        quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      }));

      const idempotencyKey = window.localStorage.getItem('hexforge.checkoutIdempotencyKey')
        || window.crypto?.randomUUID?.()
        || `checkout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem('hexforge.checkoutIdempotencyKey', idempotencyKey);

      const res = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          items: sanitizedItems,
          email: email || undefined,
          name: name?.trim() || 'Guest',
        }),
        credentials: 'include',
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse error; we'll treat as unknown
      }

      if (!res.ok) {
        console.error('Checkout failed:', data || res.statusText);
        const msg =
          data?.error ||
          `Stripe checkout failed (${res.status}). Please try again.`;
        errorToast(`❌ ${msg}`, { position: 'top-right' });
        return;
      }

      if (data && data.url) {
        infoToast('🛒 Proceeding to checkout!', { position: 'top-right' });
        window.location.href = data.url;
      } else {
        console.error('Checkout response missing URL:', data);
        errorToast('❌ Stripe Checkout failed. No URL received.', {
          position: 'top-right',
        });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      errorToast('⚠️ Something went wrong during checkout.', {
        position: 'top-right',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };


  const handleClearCart = () => {
    if (cart.length === 0) {
      warningToast('⚠️ Your cart is already empty!', { position: 'top-right' });
      return;
    }

    clearCart();
    successToast('🗑️ Cart cleared successfully!', { position: 'top-right' });
  };

  const handleRemoveFromCart = (item) => {
    removeFromCart(item);
    successToast(`🗑️ ${item.name} removed from cart!`, { position: 'top-right' });
  };

  const handleContinueShopping = () => {
    onClose();
    infoToast('🛒 Continue shopping!', { position: 'top-right' });
  };

  const handleClose = () => {
    onClose();
    infoToast('🛒 Cart closed!', { position: 'top-right' });
  };

  return (
    isOpen && (
      <div className="cart-overlay" onClick={onClose}>
        <div className={`cart-drawer ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <h3 className="cart-header">🛒 Your Cart</h3>
          <div className="cart-items-container">
            {cart.length === 0 ? (
              <p className="empty-cart-message">🛒 Your cart is empty.</p>
            ) : (
              cart.map((item, index) => (
                <div key={index} className="cart-item">
                  <div className="item-details">
                    <strong>{item.name}</strong>
                    <div className="item-price">
                      ${Number(item.price || 0).toFixed(2)}
                      {item.quantity > 1 && (
                        <span className="item-quantity"> × {item.quantity}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFromCart(item)}
                    className="action-button danger-button"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <p className="cart-total">
            Total: <span className="total-amount">${total.toFixed(2)}</span>
          </p>

          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-white mb-1">
              Name (optional)
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or alias"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-hexforge-accent"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-hexforge-accent"
            />
          </div>

          <button
            onClick={handleClearCart}
            className="action-button danger-button clear-cart-button"
          >
            🗑️ Clear Cart
          </button>
          <button
            onClick={handleContinueShopping}
            className="action-button secondary-button continue-shopping-button"
          >
            Continue Shopping
          </button>
          <button
            onClick={handleCheckout}
            className="action-button primary-button checkout-button"
            disabled={checkoutLoading}
          >
            {checkoutLoading ? 'Processing…' : '✅ Proceed to Checkout'}
          </button>
          <button
            onClick={handleClose}
            className="action-button secondary-button close-button"
          >
            Close
          </button>
        </div>
      </div>
    )
  );
}

export default CartDrawer;
