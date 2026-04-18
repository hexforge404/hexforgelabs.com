import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './AdminPage.css';
import API_BASE_URL from '../utils/apiBase';
import { errorToast, successToast } from '../utils/toastUtils';
import { resolveImageUrl } from '../utils/resolveImageUrl';

const normalizeCustomOrderImageUrl = (rawPath) => {
  if (!rawPath) return '';
  const raw = String(rawPath).trim();
  if (!raw) return '';
  if (/^data:/i.test(raw) || /^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads/') || raw.startsWith('/images/')) return raw;
  const uploadsIndex = raw.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    return raw.slice(uploadsIndex);
  }
  const fileName = raw.split('/').pop();
  if (!fileName || !fileName.includes('.')) return '';
  return `/uploads/custom-orders/${fileName}`;
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '$0.00';
};

const formatAddress = (address) => {
  if (!address) return 'Not provided';
  const parts = [address.street, address.city, address.state, address.zipCode, address.country].filter(Boolean);
  return parts.join(', ');
};

export default function AdminWorkOrderPrintPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingPrintJob, setCreatingPrintJob] = useState(false);

  const handleCreatePrintJob = async () => {
    if (!order?.orderId) return;
    setCreatingPrintJob(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/print-jobs`,
        {
          orderId: order.orderId,
          customOrderId: order._id,
          productType: order.productType,
          notes: order.notes || '',
        },
        { withCredentials: true }
      );
      successToast(`Print job ${response.data.printJobId} created.`);
    } catch (err) {
      console.error('Failed to create print job:', err);
      errorToast(err.response?.data?.error || err.message || 'Failed to create print job');
    } finally {
      setCreatingPrintJob(false);
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/custom-orders/${encodeURIComponent(orderId)}`, {
          withCredentials: true,
        });
        setOrder(response.data);
      } catch (err) {
        console.error('Failed to load work order:', err);
        errorToast(err.response?.data?.error || err.message || 'Failed to load work order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return <div className="admin-page-loading">Loading work order...</div>;
  }

  if (!order) {
    return (
      <div className="admin-page-loading">
        <h1>Work Order not found</h1>
        <button
          type="button"
          className="secondary-button small-button"
          onClick={() => navigate('/admin')}
        >
          Back to Admin
        </button>
      </div>
    );
  }

  const imageCount = Array.isArray(order.images) ? order.images.length : order.imagesCount || 0;
  const customer = order.customer || {};
  const shippingAddress = formatAddress(customer.shippingAddress);
  const orderSize = order.size || order.panelSize || 'N/A';
  const panelCount = order.panels || imageCount || 'N/A';

  return (
    <div className="work-order-print-page">
      <div className="work-order-controls">
        <button
          type="button"
          className="secondary-button small-button"
          onClick={() => handleCreatePrintJob()}
          disabled={creatingPrintJob}
        >
          {creatingPrintJob ? 'Creating Print Job…' : 'Create Print Job'}
        </button>
        <button
          type="button"
          className="secondary-button small-button"
          onClick={() => window.print()}
        >
          Print Work Order
        </button>
        <button
          type="button"
          className="secondary-button small-button"
          onClick={() => navigate('/admin')}
        >
          Back To Admin
        </button>
      </div>

      <div className="work-order-sheet">
        <header className="work-order-header">
          <div>
            <div className="work-order-title">Custom Order Work Order</div>
            <div className="work-order-subtitle">Order ID: {order.orderId}</div>
          </div>
          <div className="work-order-meta">
            <div><strong>Date:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</div>
            <div><strong>Payment Status:</strong> {order.paymentStatus || 'Unknown'}</div>
            <div><strong>Fulfillment Status:</strong> {order.fulfillmentStatus || order.status || 'Unknown'}</div>
          </div>
        </header>

        <section className="work-order-section">
          <h2>Customer</h2>
          <div className="work-order-grid">
            <div><strong>Name:</strong> {customer.name || 'Unknown'}</div>
            <div><strong>Email:</strong> {customer.email || 'Unknown'}</div>
            <div><strong>Phone:</strong> {customer.phone || 'Unknown'}</div>
            <div><strong>Shipping:</strong> {shippingAddress}</div>
          </div>
        </section>

        <section className="work-order-section">
          <h2>Order Details</h2>
          <div className="work-order-grid">
            <div><strong>Product:</strong> {order.productName || 'Unknown'}</div>
            <div><strong>Type:</strong> {order.productType || 'Unknown'}</div>
            <div><strong>Size:</strong> {orderSize}</div>
            <div><strong>Panels:</strong> {panelCount}</div>
            <div><strong>Light Type:</strong> {order.lightType || 'Unknown'}</div>
          </div>
        </section>

        <section className="work-order-section">
          <h2>Pricing</h2>
          <div className="work-order-grid">
            <div><strong>Total Price:</strong> {formatCurrency(order.totalPrice)}</div>
            <div><strong>Deposit:</strong> {formatCurrency(order.depositAmount)}</div>
            <div><strong>Remaining:</strong> {formatCurrency(order.remainingBalance)}</div>
          </div>
        </section>

        <section className="work-order-section">
          <h2>Notes</h2>
          <div className="work-order-note-block">
            <strong>Customer Notes</strong>
            <p>{order.notes || 'None'}</p>
          </div>
          <div className="work-order-note-block">
            <strong>Admin Notes</strong>
            <p>{order.adminNotes || 'None'}</p>
          </div>
        </section>

        <section className="work-order-section">
          <h2>Uploaded Images ({imageCount})</h2>
          {imageCount ? (
            <div className="work-order-image-list">
              {order.images.map((img, index) => {
                const imageUrl = normalizeCustomOrderImageUrl(img.path || img.publicUrl || img.relativePath);
                const resolvedUrl = imageUrl ? resolveImageUrl(imageUrl) : '';
                return (
                  <div key={index} className="work-order-image-item">
                    <div className="work-order-image-thumb-wrap">
                      {resolvedUrl ? (
                        <img
                          src={resolvedUrl}
                          alt={img.originalName || `Image ${index + 1}`}
                          className="work-order-image-thumb"
                        />
                      ) : (
                        <div className="work-order-image-missing">No preview</div>
                      )}
                    </div>
                    <div className="work-order-image-info">
                      <div>{img.originalName || `Image ${index + 1}`}</div>
                      <div>{img.panel ? `Panel ${img.panel}` : `Image ${index + 1}`}</div>
                      <div>{img.size ? `${(img.size / 1024).toFixed(1)} KB` : 'Size unknown'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No uploaded images available.</p>
          )}
        </section>

        <section className="work-order-section">
          <h2>Fulfillment Checklist</h2>
          <ul className="work-order-checklist">
            <li>Images reviewed</li>
            <li>Print approved</li>
            <li>Printed</li>
            <li>Assembled</li>
            <li>Packed</li>
            <li>Shipped</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
