import React from 'react';
// Correct path
import { useCart } from 'context/CartContext';


function Cart() {
  const { cart, removeFromCart, clearCart } = useCart();
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="cart-container">
      <div className="cart-header-container">
        <h3 className="cart-header">🛒 Your Cart ({cart.length})</h3>
        {cart.length > 0 && (
          <button 
            onClick={clearCart} 
            className="action-button danger-button small-button clear-all-btn"
          >
            Clear All
          </button>
        )}
      </div>
      
      {cart.length === 0 ? (
        <p className="empty-cart-message">✨ Your cart is empty. Add some items!</p>
      ) : (
        <>
          <ul className="cart-items-list">
            {cart.map((item, index) => (
              <li key={`${item.id}-${index}`} className="cart-item">
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="item-thumbnail"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <div className="item-meta">
                  <span className="item-price">${item.price.toFixed(2)}</span>
                  <button 
                    onClick={() => removeFromCart(item)} 
                    className="action-button danger-button small-button"
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
          
          <div className="cart-footer">
            <div className="cart-total">
              <span>Subtotal:</span>
              <span className="total-amount">${total.toFixed(2)}</span>
            </div>
            <button 
              className="action-button primary-button checkout-btn"
              disabled={cart.length === 0}
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
