import React, { useEffect, useState } from 'react';
import './SuccessPage.css';
import { successToast, errorToast, warningToast } from '../utils/toastUtils';
import { useCart } from 'context/CartContext';
import 'react-toastify/dist/ReactToastify.css';
import confetti from 'canvas-confetti';

function SuccessPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [didCelebrate, setDidCelebrate] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [newsletter, setNewsletter] = useState('');
  const { clearCart } = useCart();

  useEffect(() => {
    const fetchOrder = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('orderId');

      if (!orderId) {
        setErrorMessage('Missing order ID in the URL.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || body.error || `Unable to load order (${res.status}).`);
        }

        const data = await res.json();
        setOrder(data);
        window.scrollTo(0, 0);

        if (data.paymentStatus === 'paid') {
          successToast('✅ Order confirmed!');
          if (!didCelebrate) {
            try {
              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
              setDidCelebrate(true);
            } catch (confettiErr) {
              console.warn('Confetti failed:', confettiErr);
            }
          }
          setTimeout(() => {
            clearCart();
          }, 300);
        } else {
          warningToast('⚠️ Your order is saved, but payment is still pending.', {
            position: 'top-right',
          });
        }

        localStorage.removeItem('lastOrderEmail');
      } catch (err) {
        console.error('❌ Order fetch failed:', err);
        setErrorMessage(err.message || 'Failed to retrieve your order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [clearCart, didCelebrate]);

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

  const formatMoney = (value) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    return `$${Number(value).toFixed(2)}`;
  };

  const formatDate = (value) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getImageCount = () => {
    if (Array.isArray(order?.images)) {
      return order.images.filter(Boolean).length;
    }
    if (Number.isFinite(order?.imagesCount)) {
      return order.imagesCount;
    }
    return undefined;
  };

  const renderShippingAddress = () => {
    const address = order?.customer?.shippingAddress;
    if (!address || !Object.values(address).some(Boolean)) return null;
    return (
      <div>
        <div>{address.street || 'Street address not provided'}</div>
        <div>
          {address.city || 'City'}, {address.state || 'State'} {address.zipCode || 'ZIP'}
        </div>
        <div>{address.country || 'Country not provided'}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="success-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your order details...</p>
        </div>
      </div>
    );
  }

  const hasOrder = Boolean(order && order.orderId);
  const imagesCount = getImageCount();
  const invoiceItems = Array.isArray(order?.items) ? order.items : [];

  return (
    <div className="success-container">
      <div className="success-card">
        <img
          src={process.env.PUBLIC_URL + '/images/hexforge-logo-removebg.png'}
          alt="HexForge Labs Logo"
          style={{ width: '160px', marginBottom: '1rem' }}
        />

        {hasOrder ? (
          <>
            <h2 className="success-title">
              {order.paymentStatus === 'paid' ? '🎉 Order Confirmed' : '⚠️ Payment Pending'}
            </h2>
            <p className="success-message">
              {order.paymentStatus === 'paid'
                ? 'Thank you! Your payment is complete and your order is now being processed.'
                : 'We have received your order, but payment is not confirmed yet. Please complete checkout to finalize the order.'}
            </p>

            <section className="order-summary">
              <h3>Order Summary</h3>
              <div className="order-id"><strong>Order ID:</strong> {order.orderId}</div>
              <div><strong>Payment Status:</strong> {order.paymentStatus || 'Unknown'}</div>
              <div><strong>Order Status:</strong> {order.status || 'Unknown'}</div>
              <div><strong>Order Date:</strong> {formatDate(order.createdAt)}</div>
              <div><strong>Customer Email:</strong> {order.customer?.email || 'Not provided'}</div>
              <div><strong>Payment Method:</strong> {order.paymentMethod || 'Stripe'}</div>
            </section>

            <section className="order-summary">
              <h3>Items</h3>
              {invoiceItems.length > 0 ? (
                <ul className="order-items">
                  {invoiceItems.map((item, index) => (
                    <li key={index}>
                      <div>{item.name || 'Unnamed item'}</div>
                      <div>
                        {formatMoney(item.price)} × {item.quantity || 1} = {formatMoney((item.price || 0) * (item.quantity || 1))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No item details are available for this order.</p>
              )}
            </section>

            <section className="order-summary">
              <h3>Pricing</h3>
              <div><strong>Subtotal:</strong> {formatMoney(order.subtotal)}</div>
              <div><strong>Shipping:</strong> {formatMoney(order.shippingCost)}</div>
              <div><strong>Tax:</strong> {formatMoney(order.tax)}</div>
              {order.discountAmount != null && Number(order.discountAmount) > 0 && (
                <div><strong>Discount:</strong> -{formatMoney(order.discountAmount)}</div>
              )}
              {order.depositAmount != null && (
                <div><strong>Deposit Paid:</strong> {formatMoney(order.depositAmount)}</div>
              )}
              {order.remainingBalance != null && (
                <div><strong>Remaining Balance:</strong> {formatMoney(order.remainingBalance)}</div>
              )}
              <p className="order-total"><strong>Total Paid:</strong> {formatMoney(order.total)}</p>
            </section>

            {(imagesCount != null || order.productType || order.notes) && (
              <section className="order-summary">
                <h3>Order Details</h3>
                {order.productType && <div><strong>Product Type:</strong> {order.productType}</div>}
                {imagesCount != null && <div><strong>Uploaded Images:</strong> {imagesCount}</div>}
                {order.notes && <div><strong>Notes:</strong> {order.notes}</div>}
              </section>
            )}

            {order.customer?.shippingAddress && (
              <section className="order-summary">
                <h3>Shipping Summary</h3>
                {renderShippingAddress()}
              </section>
            )}

            <section className="disclaimer">
              <h3>What happens next</h3>
              <p>We have received your paid order and are preparing it for production. You will receive email updates when your order ships.</p>
              <p>If you do not receive a confirmation email within a few minutes, please contact us at <a href="mailto:support@hexforgelabs.com">support@hexforgelabs.com</a>.</p>
            </section>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              <a href="/" className="back-button"><span style={{ marginRight: '8px' }}>←</span>Back to Store</a>
              <button onClick={() => window.print()} className="return-button">🧾 Print Receipt</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="success-title">Order Confirmation Error</h2>
            <p className="success-message">We could not retrieve confirmation details for this order.</p>
            <p>{errorMessage || 'Please verify your order link or contact support for help.'}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              <a href="/" className="back-button"><span style={{ marginRight: '8px' }}>←</span>Return to Store</a>
            </div>
          </>
        )}

        {hasOrder && (
          <div className="feedback" style={{ marginTop: '2rem' }}>
            <h3>💬 Got feedback?</h3>
            <textarea rows="4" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Let us know what you think..." />
            <button type="button" onClick={handleFeedbackSubmit}>Send Feedback</button>
          </div>
        )}

        {hasOrder && (
          <div className="newsletter">
            <h3>📬 Join Our Newsletter</h3>
            <input type="email" value={newsletter} onChange={(e) => setNewsletter(e.target.value)} placeholder="Get updates, discounts, and more" />
            <button type="button" onClick={handleNewsletterSignup}>Sign Up</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuccessPage;
