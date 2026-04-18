import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { successToast, errorToast, infoToast } from '../utils/toastUtils';
import './OrdersPage.css';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'custom'

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch regular orders
      const ordersResponse = await axios.get('/api/orders');
      console.log('Fetched orders response:', ordersResponse.data);
      setOrders(ordersResponse.data.data || []);
      
      // Fetch custom lamp orders
      const customResponse = await axios.get('/api/admin/custom-orders');
      console.log('Fetched custom orders response:', customResponse.data);
      setCustomOrders(customResponse.data.data || []);
      
      if ((ordersResponse.data.data?.length || 0) + (customResponse.data.data?.length || 0) === 0) {
        infoToast('No orders found');
      } else {
        successToast('Orders loaded successfully');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
      errorToast('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      await axios.delete(`/api/orders/${id}`);
      setOrders(prev => prev.filter(order => order._id !== id));
      successToast('Order deleted successfully');
    } catch (err) {
      console.error('Error deleting order:', err);
      errorToast('Failed to delete order');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await axios.patch(`/api/orders/${orderId}`, {
        status: newStatus
      });
      setOrders(prev => prev.map(order => 
        order._id === orderId ? response.data : order
      ));
      successToast(`Order status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating order status:', err);
      errorToast('Failed to update order status');
    }
  };

  const handleCustomOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await axios.patch(`/api/admin/custom-orders/${orderId}`, {
        status: newStatus
      });
      setCustomOrders(prev => prev.map(order => 
        order.orderId === orderId ? response.data : order
      ));
      successToast(`Custom order status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating custom order status:', err);
      errorToast('Failed to update custom order status');
    }
  };

  const handleCustomOrderNotesUpdate = async (orderId, notes) => {
    try {
      const response = await axios.patch(`/api/admin/custom-orders/${orderId}`, {
        adminNotes: notes
      });
      setCustomOrders(prev => prev.map(order => 
        order.orderId === orderId ? response.data : order
      ));
      successToast('Custom order notes updated');
    } catch (err) {
      console.error('Error updating custom order notes:', err);
      errorToast('Failed to update custom order notes');
    }
  };

  const formatOrderId = (id) => {
    return id ? `#${id.slice(-6).toUpperCase()}` : '#N/A';
  };

  const renderRegularOrders = () => {
    return Array.isArray(orders) ? (
      orders.length > 0 ? (
        <div className="orders-grid">
          {orders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <h3 className="order-id">
                  {formatOrderId(order._id)}
                </h3>
                <p className="order-date">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
                <button
                  onClick={() => handleDelete(order._id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>

              <div className="order-status">
                <label>Status:</label>
                <select
                  value={order.status || 'pending'}
                  onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                  className="status-select"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="order-items">
                <h4>Items:</h4>
                <ul>
                  {Array.isArray(order.items) ? (
                    order.items.map((item, index) => (
                      <li key={index}>
                        {item.name || 'Unnamed Item'} - ${item.price?.toFixed(2) || '0.00'}
                      </li>
                    ))
                  ) : (
                    <li>No items found</li>
                  )}
                </ul>
              </div>

              <div className="order-total">
                <strong>Total:</strong> ${order.total?.toFixed(2) ||
                  (Array.isArray(order.items)
                    ? order.items.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2)
                    : '0.00')}
              </div>

              {order.customer && (
                <div className="customer-info">
                  <h4>Customer:</h4>
                  <p>{order.customer.name || 'N/A'}</p>
                  <p>{order.customer.email || 'No email provided'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="no-orders">No regular orders found</p>
      )
    ) : (
      <p className="no-orders">Unable to load orders</p>
    );
  };

  const renderCustomOrders = () => {
    return Array.isArray(customOrders) ? (
      customOrders.length > 0 ? (
        <div className="orders-grid">
          {customOrders.map((order) => (
            <div key={order._id} className="order-card custom-order-card">
              <div className="order-header">
                <h3 className="order-id">{order.orderId}</h3>
                <p className="order-date">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="custom-order-details">
                <div className="detail-row">
                  <strong>Product:</strong> {order.productName}
                </div>
                <div className="detail-row">
                  <strong>Panels:</strong> {order.panels}
                </div>
                <div className="detail-row">
                  <strong>Size:</strong> {order.size}
                </div>
                <div className="detail-row">
                  <strong>Light Type:</strong> {order.lightType}
                </div>
                {order.notes && (
                  <div className="detail-row">
                    <strong>Notes:</strong> {order.notes}
                  </div>
                )}
                <div className="detail-row">
                  <strong>Images:</strong> {order.images?.length || 0} uploaded
                </div>
              </div>

              <div className="custom-order-status">
                <label>Status:</label>
                <select
                  value={order.status || 'submitted'}
                  onChange={(e) => handleCustomOrderStatusUpdate(order.orderId, e.target.value)}
                  className="status-select"
                >
                  <option value="submitted">Submitted</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="custom-order-notes">
                <label>Admin Notes:</label>
                <textarea
                  value={order.adminNotes || ''}
                  onChange={(e) => {
                    const newNotes = e.target.value;
                    setCustomOrders(prev => prev.map(o =>
                      o.orderId === order.orderId ? { ...o, adminNotes: newNotes } : o
                    ));
                  }}
                  onBlur={() => handleCustomOrderNotesUpdate(order.orderId, order.adminNotes)}
                  className="notes-textarea"
                  placeholder="Enter admin notes..."
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-orders">No custom lamp orders found</p>
      )
    ) : (
      <p className="no-orders">Unable to load custom orders</p>
    );
  };

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-container">
        <div className="error-message">
          <p>{error}</p>
          <button 
            onClick={fetchAllOrders}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <h1 className="orders-title">Order Management</h1>
      
      <div className="orders-tabs">
        <button
          className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Regular Orders ({orders.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'custom' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          Custom Lamp Orders ({customOrders.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'orders' && renderRegularOrders()}
        {activeTab === 'custom' && renderCustomOrders()}
      </div>
    </div>
  );
};

export default OrdersPage;
