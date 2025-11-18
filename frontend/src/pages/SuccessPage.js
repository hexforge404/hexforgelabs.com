import React, { useEffect, useState } from 'react';
import './SuccessPage.css';
import { successToast, errorToast, warningToast } from '../utils/toastUtils';
import { useCart } from 'context/CartContext';
import 'react-toastify/dist/ReactToastify.css';
import confetti from 'canvas-confetti';

function SuccessPage() {
  const [hasFetched, setHasFetched] = useState(false);
  const [didCelebrate, setDidCelebrate] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [newsletter, setNewsletter] = useState('');
  const { clearCart } = useCart();

  useEffect(() => {
    if (hasFetched) return;

    const fetchOrder = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);

        // ✅ Accept both new and old param names
        const orderId = urlParams.get('orderId');

        if (!orderId) {
          throw new Error('Missing orderId in URL');
        }

        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch order: ${res.status}`);
        }

        const data = await res.json();
        console.log('✅ Order loaded:', data);
        setOrder(data);
        setHasFetched(true);

        successToast('✅ Order confirmed!');
        window.scrollTo(0, 0);

        // Clear cart shortly after success
        setTimeout(() => {
          clearCart();
        }, 300);

        // 🎉 Launch confetti once
        if (!didCelebrate) {
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
            setDidCelebrate(true);
          } catch (confettiErr) {
            console.warn('Confetti failed:', confettiErr);
          }
        }

        // Clean up stored email (if any)
        localStorage.removeItem('lastOrderEmail');
      } catch (err) {
        console.error('❌ Order fetch failed:', err);
        setError(true);
        setHasFetched(true);
      }
    };

    fetchOrder();
  }, [hasFetched, didCelebrate, clearCart]);

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      warningToast('Please enter your feedback before submitting.');
      return;
    }
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedback, email: order?.customer?.email || '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Feedback submission failed');
      successToast(data.message || '✅ Feedback submitted!');
      setFeedback('');
    } catch (err) {
      console.error('❌ Feedback Error:', err);
      errorToast('⚠️ Feedback submission failed. Please try again.');
    }
  };

  const handleNewsletterSignup = async () => {
    if (!newsletter.trim()) {
      warningToast('Please enter a valid email.');
      return;
    }
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletter, name: order?.customer?.name || 'Guest' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Subscription failed');
      successToast(data.message || '✅ Subscribed to newsletter!');
      setNewsletter('');
    } catch (err) {
      console.error('❌ Newsletter Error:', err);
      errorToast('⚠️ Subscription failed. Please try again.');
    }
  };

  if (!order && !error) {
    return (
      <div className="success-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your order...</p>
        </div>
      </div>
    );
  }

  const estimateDelivery = () => {
    if (!order?.createdAt) return null;
    const created = new Date(order.createdAt);
    const min = new Date(created);
    const max = new Date(created);
    min.setDate(min.getDate() + 3);
    max.setDate(max.getDate() + 7);
    return `📦 Estimated Delivery: ${min.toLocaleDateString()} – ${max.toLocaleDateString()}`;
  };

  return (
    <div className="success-container">
      <div className="success-card">
        <img src="/images/hexforge-logo-removebg.png" alt="HexForge Labs Logo" style={{ width: '160px', marginBottom: '1rem' }} />
        <h2>🎉 Order Received</h2>
        <p style={{ color: '#52e3c2', fontSize: '0.95rem' }}>✅ Your transaction has been securely processed.</p>
        <p style={{ color: '#8892b0', fontSize: '0.85rem' }}>🔒 SSL Secured — Your data is encrypted and safe.</p>

        {error || !order ? (
          <>
            <p>Your order was placed successfully, but we couldn’t retrieve the full details.</p>
            <p>If you entered an email, you should receive a confirmation shortly.</p>
            <p>Need assistance? We’re here to help — just reach out anytime.</p>
            <p>Thank you for your support!</p>
          </>
        ) : (
          <>
            <p>Your order has been confirmed. Below are your secure order details:</p>
            <p><strong>Order ID:</strong> {order.orderId}</p>
            <p><strong>Name:</strong> {order.customer?.name}</p>
            <p><strong>Email:</strong> {order.customer?.email}</p>
            <ul className="order-item-list">
              {order.items?.map((item, i) => (
                <li key={i}>{item.name} – ${item.price.toFixed(2)} × {item.quantity}</li>
              ))}
            </ul>
            <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
            <p style={{ marginTop: '1rem', color: '#52e3c2' }}>{estimateDelivery()}</p>
          </>
        )}

        <p style={{ marginTop: '1.5rem', fontSize: '1.2rem', color: '#64ffda' }}>✨ Happy Hacking — and thank you for supporting HexForge Labs!</p>

        <div className="feedback">
          <h3>💬 Got feedback?</h3>
          <textarea rows="4" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Let us know what you think..." />
          <button type="button" onClick={handleFeedbackSubmit}>Send Feedback</button>
        </div>

        <div className="newsletter">
          <h3>📬 Join Our Newsletter</h3>
          <input type="email" value={newsletter} onChange={(e) => setNewsletter(e.target.value)} placeholder="Get updates, discounts, and more" />
          <button type="button" onClick={handleNewsletterSignup}>Sign Up</button>
        </div>

        <div className="footer-grid">
          <div className="support-contact">
            <h3>Need Help?</h3>
            <p>Email us at <a href="mailto:support@hexforgelabs.com">support@hexforgelabs.com</a> or message us via our site.</p>
            <p>We’re here to assist you with any questions or concerns.</p>
            <p>Thank you for being a part of the HexForge community!</p>
          </div>

          <div className="legal-social">
            <h3>Legal & Links</h3>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="/shipping">Shipping</a>
            <a href="/returns">Returns</a>
            <a href="/contact">Contact</a>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
          <a href="/" className="back-button">
            <span style={{ marginRight: '8px' }}>←</span>Back to Store
          </a>
          <button onClick={() => window.print()} className="return-button">🧾 Print Receipt</button>
          <button className="return-button" disabled>📦 Track Order</button>
        </div>

      </div>
    </div>
  );
}

export default SuccessPage;
