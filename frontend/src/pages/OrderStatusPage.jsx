import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './OrderStatusPage.css';

const STATUS_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'awaiting_deposit', label: 'Awaiting Deposit' },
  { key: 'deposit_paid', label: 'Deposit Paid' },
  { key: 'reviewing_assets', label: 'Reviewing Assets' },
  { key: 'in_production', label: 'In Production' },
  { key: 'ready_to_ship', label: 'Ready To Ship' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatLightTypeForDisplay = (lightType, { internal = false } = {}) => {
  if (lightType === 'rgb') {
    return internal ? 'Legacy RGB option' : 'LED';
  }
  if (!lightType) return '—';
  return lightType;
};

const getSafeName = (name) => {
  if (!name) return 'Customer';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
};

const OrderStatusPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const res = await fetch(`/api/products/custom-orders/${encodeURIComponent(orderId)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Order not found');
        }
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        console.error('Order status load failed:', err);
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  const currentIndex = useMemo(() => {
    if (!order?.status) return -1;
    return STATUS_STEPS.findIndex((step) => step.key === order.status);
  }, [order]);

  if (loading) {
    return (
      <div className="order-status-container">
        <div className="order-status-card">
          <h2>Loading Order Status...</h2>
          <p>We are fetching the latest updates for your custom lamp order.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-status-container">
        <div className="order-status-card">
          <h2>Order Status Unavailable</h2>
          <p>{error}</p>
          <Link to="/store" className="order-status-link">Return to Store</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="order-status-container">
      <div className="order-status-card">
        <h2>Custom Order Status</h2>
        <p>Hi {getSafeName(order.customer?.name)}, here is the latest on your order.</p>

        <div className="order-status-summary">
          <div><strong>Order ID:</strong> {order.orderId}</div>
          <div><strong>Product:</strong> {order.productName}</div>
          <div><strong>Size:</strong> {order.size}</div>
          <div><strong>Panels:</strong> {order.panels}</div>
          <div><strong>Light Type:</strong> {formatLightTypeForDisplay(order.lightType)}</div>
          <div><strong>Uploaded Images:</strong> {order.imagesCount || 0}</div>
          <div><strong>Status:</strong> {order.status}</div>
          <div><strong>Payment Status:</strong> {order.paymentStatus}</div>
        </div>

        <div className="order-status-pricing">
          <h3>Pricing</h3>
          {order.discountAmount > 0 && (
            <div className="order-status-row">
              <span>Original Price</span>
              <span className="order-status-strike">{formatMoney(order.originalPrice)}</span>
            </div>
          )}
          {order.discountAmount > 0 && (
            <div className="order-status-row">
              <span>Discount</span>
              <span className="order-status-discount">-{formatMoney(order.discountAmount)}</span>
            </div>
          )}
          {order.promoCode && (
            <div className="order-status-row">
              <span>Promo Code</span>
              <span>{order.promoCode}</span>
            </div>
          )}
          <div className="order-status-row">
            <span>Total</span>
            <span>{formatMoney(order.totalPrice)}</span>
          </div>
          <div className="order-status-row">
            <span>Deposit Paid</span>
            <span>{formatMoney(order.depositAmount)}</span>
          </div>
          <div className="order-status-row">
            <span>Remaining Balance</span>
            <span>{formatMoney(order.remainingBalance)}</span>
          </div>
        </div>

        <div className="order-status-timeline">
          {STATUS_STEPS.map((step, index) => {
            const isComplete = currentIndex >= index && order.status !== 'cancelled';
            const isActive = order.status === step.key;
            const isCancelled = order.status === 'cancelled' && step.key === 'cancelled';
            return (
              <div
                key={step.key}
                className={`order-status-step ${isComplete ? 'complete' : ''} ${isActive ? 'active' : ''} ${isCancelled ? 'cancelled' : ''}`}
              >
                <div className="order-status-dot" />
                <div className="order-status-label">{step.label}</div>
              </div>
            );
          })}
        </div>

        <div className="order-status-tracking">
          <h3>Tracking</h3>
          {order.trackingCarrier || order.trackingNumber || order.trackingUrl ? (
            <div className="order-status-tracking-details">
              <div><strong>Carrier:</strong> {order.trackingCarrier || 'Pending'}</div>
              <div><strong>Tracking #:</strong> {order.trackingNumber || 'Pending'}</div>
              {order.trackingUrl && (
                <div>
                  <a href={order.trackingUrl} target="_blank" rel="noreferrer">Track Shipment</a>
                </div>
              )}
            </div>
          ) : (
            <p>Tracking details will appear here once your order ships.</p>
          )}
        </div>

        <div className="order-status-actions">
          <Link to="/store" className="order-status-link">Back to Store</Link>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusPage;
