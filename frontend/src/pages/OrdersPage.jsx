import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { successToast, errorToast, warningToast, infoToast } from '../utils/toastUtils';
import './OrdersPage.css';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/orders');
console.log('Fetched orders response:', response.data);
setOrders(response.data.data); // ✅ Fix here
      if (response.data.data.length === 0) {
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

  const formatOrderId = (id) => {
    return id ? `#${id.slice(-6).toUpperCase()}` : '#N/A';
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
            onClick={fetchOrders}
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
      <h1 className="orders-title">Order History</h1>
      
      {Array.isArray(orders) ? (
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
    <p className="no-orders">No orders found</p>
  )
) : (
  <p className="no-orders">Unable to load orders</p>
)}
    </div>
  );
};

export default OrdersPage;
