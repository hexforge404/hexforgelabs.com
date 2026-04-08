import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { successToast, errorToast } from '../utils/toastUtils';
import './CustomOrderSuccessPage.css';

const CustomOrderSuccessPage = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingCopied, setTrackingCopied] = useState(false);
  const [trackingFullCopied, setTrackingFullCopied] = useState(false);
  const location = useLocation();
  const copyTimeoutRef = useRef(null);
  const copyFullTimeoutRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('orderId');
    const sessionId = params.get('sessionId');

    if (!orderId) {
      setError('Missing order ID in the URL.');
      setLoading(false);
      return;
    }

    const confirmAndFetch = async () => {
      try {
        if (sessionId) {
          const confirmRes = await fetch(`/api/products/custom-orders/${encodeURIComponent(orderId)}/confirm-deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          if (!confirmRes.ok) {
            const body = await confirmRes.json().catch(() => ({}));
            console.warn('Deposit confirmation response:', body);
          } else {
            successToast('Deposit confirmed. Your custom order is now active.');
          }
        }

        const res = await fetch(`/api/products/custom-orders/${encodeURIComponent(orderId)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load the order.');
        }

        const data = await res.json();
        setOrder(data);
      } catch (err) {
        console.error('Custom order success load failed:', err);
        setError(err.message || 'Failed to load custom order details.');
      } finally {
        setLoading(false);
      }
    };

    confirmAndFetch();
  }, [location.search]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      if (copyFullTimeoutRef.current) {
        clearTimeout(copyFullTimeoutRef.current);
      }
    };
  }, []);

  const renderShippingAddress = (address) => {
    if (!address) return null;
    return (
      <div className="custom-order-success-address">
        <div>{address.street}</div>
        <div>{address.city}, {address.state} {address.zipCode}</div>
        <div>{address.country}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="custom-order-success-container">
        <div className="custom-order-success-card">
          <h2>Loading Custom Order...</h2>
          <p>Please wait while we verify your deposit and retrieve order details.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="custom-order-success-container">
        <div className="custom-order-success-card">
          <h2>Order Confirmation Error</h2>
          <p>{error}</p>
          <Link to="/store" className="custom-order-success-link">Return to Store</Link>
        </div>
      </div>
    );
  }

  const trackingPath = `/order/${encodeURIComponent(order.orderId)}`;
  const trackingLabel = `/order/${order.orderId}`;

  const handleCopyTracking = async () => {
    const copyValue = trackingPath;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyValue);
      } else {
        const input = document.createElement('input');
        input.value = copyValue;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setTrackingCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setTrackingCopied(false);
      }, 2000);
      successToast('Tracking link copied.');
    } catch (copyError) {
      console.error('Failed to copy tracking link:', copyError);
      setTrackingCopied(false);
      errorToast('Could not copy the tracking link.');
    }
  };

  const handleCopyTrackingFull = async () => {
    const fullUrl = `${window.location.origin}${trackingPath}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const input = document.createElement('input');
        input.value = fullUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setTrackingFullCopied(true);
      if (copyFullTimeoutRef.current) {
        clearTimeout(copyFullTimeoutRef.current);
      }
      copyFullTimeoutRef.current = setTimeout(() => {
        setTrackingFullCopied(false);
      }, 2000);
      successToast('Full tracking link copied.');
    } catch (copyError) {
      console.error('Failed to copy full tracking link:', copyError);
      setTrackingFullCopied(false);
      errorToast('Could not copy the full tracking link.');
    }
  };

  return (
    <div className="custom-order-success-container">
      <div className="custom-order-success-card">
        <h2>✅ Custom Lamp Order Confirmed</h2>
        <p>Your custom lamp request is now in our system.</p>

        <div className="custom-order-success-summary">
          <div className="custom-order-summary-block">
            <h3>Order Summary</h3>
            <div><strong>Order ID:</strong> {order.orderId}</div>
            <div><strong>Customer:</strong> {order.customer?.name}</div>
            <div><strong>Product:</strong> {order.productName}</div>
            <div><strong>Size:</strong> {order.size}</div>
            <div><strong>Panels:</strong> {order.panels}</div>
            <div><strong>Light Type:</strong> {order.lightType}</div>
            <div><strong>Uploaded Images:</strong> {order.images?.length || 0}</div>
          </div>

          <div className="custom-order-summary-block">
            <h3>Pricing</h3>
            {order.discountAmount > 0 && (
              <div className="custom-order-price-row">
                <span>Original Price</span>
                <span className="custom-order-price-strike">${order.originalPrice?.toFixed(2)}</span>
              </div>
            )}
            {order.discountAmount > 0 && (
              <div className="custom-order-price-row">
                <span>Discount</span>
                <span className="custom-order-price-discount">-${order.discountAmount?.toFixed(2)}</span>
              </div>
            )}
            {order.discountAmount > 0 && order.promoCode && (
              <div className="custom-order-price-row">
                <span>Promo Code</span>
                <span>{order.promoCode}</span>
              </div>
            )}
            <div className="custom-order-price-row">
              <span>Total</span>
              <span>${order.totalPrice?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="custom-order-price-row">
              <span>Deposit Paid</span>
              <span>${order.depositAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="custom-order-price-row">
              <span>Remaining Balance</span>
              <span>${order.remainingBalance?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>

        <div className="custom-order-success-details">
          <div>
            <strong>Status:</strong> {order.status}
          </div>
          <div>
            <strong>Payment Status:</strong> {order.paymentStatus}
          </div>
          <div>
            <strong>Shipping Address:</strong>
            {renderShippingAddress(order.customer?.shippingAddress)}
          </div>
          <div>
            <strong>Tracking:</strong>{' '}
            {order.trackingCarrier ? `${order.trackingCarrier} / ${order.trackingNumber}` : 'Not available yet'}
          </div>
          {order.trackingUrl && (
            <div>
              <a href={order.trackingUrl} target="_blank" rel="noreferrer">Track shipment</a>
            </div>
          )}
        </div>

        <div className="custom-order-success-message">
          {order.status === 'awaiting_deposit' && (
            <p>✅ Deposit is pending. Please complete the Stripe payment to confirm your order.</p>
          )}
          {order.status === 'deposit_paid' && (
            <p>🎉 Deposit received. Your custom lamp order will move into production shortly.</p>
          )}
          {order.status === 'in_production' && (
            <p>🔧 Your lamp is in production. We’ll update tracking when it ships.</p>
          )}
          {order.status === 'shipped' && (
            <p>📦 Your lamp has shipped. Tracking details are available above.</p>
          )}
        </div>

        <div className="custom-order-success-reminder">
          <p>Bookmark your tracking page so you can check progress anytime.</p>
          <div className="custom-order-success-reminder-actions">
            <Link to={trackingPath}>
              {trackingLabel}
            </Link>
            <button
              type="button"
              onClick={handleCopyTracking}
              className={`custom-order-success-copy${trackingCopied ? ' is-copied' : ''}`}
              disabled={trackingCopied}
            >
              {trackingCopied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={handleCopyTrackingFull}
              className={`custom-order-success-copy full${trackingFullCopied ? ' is-copied' : ''}`}
              disabled={trackingFullCopied}
            >
              {trackingFullCopied ? 'Copied!' : 'Copy full link'}
            </button>
          </div>
        </div>

        <div className="custom-order-success-actions">
          <Link
            to={trackingPath}
            className="custom-order-success-secondary"
          >
            View Order Status
          </Link>
          <Link to="/store" className="custom-order-success-link">Back to Store</Link>
        </div>
      </div>
    </div>
  );
};

export default CustomOrderSuccessPage;
