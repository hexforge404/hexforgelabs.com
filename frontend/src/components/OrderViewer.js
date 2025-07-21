import React, { useEffect, useState } from 'react';

function OrderViewer() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_BASE_URL}/orders`)
      .then((res) => res.json())
      .then((data) => setOrders(data))
      .catch((err) => console.error('Failed to fetch orders:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="admin-container">
      <div className="section-header-container">
        <h2 className="section-header">📂 Orders</h2>
      </div>

      {isLoading ? (
        <div className="loading">
          <span className="spinner"></span>
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p>No orders found</p>
        </div>
      ) : (
        <div className="order-grid">
          {orders.map((order, index) => (
            <div key={index} className="order-card">
              <div className="order-header">
                <h3 className="order-id">
                  🧾 Order #{order.orderId || index + 1}
                </h3>
                <p className="order-date">
                  🕒 {order.timestamp ? new Date(order.timestamp).toLocaleString() : 'Unknown time'}
                </p>
              </div>

              <div className="order-items">
                <ul className="items-list">
                  {order.items.map((item, i) => (
                    <li key={i} className="order-item">
                      <span className="item-name">{item.name}</span>
                      <span className="item-price">${item.price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="order-footer">
                <p className="order-total">
                  Total: <span className="total-amount">${order.items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</span>
                </p>
                {order.status && (
                  <div className="order-status">
                    <span className={`status-badge ${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrderViewer;
