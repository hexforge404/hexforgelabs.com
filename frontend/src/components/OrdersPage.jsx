import React, { useEffect, useState } from 'react';

function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched orders:', data);
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Failed to fetch orders:', err);
      });
  }, []);

  return (
    <div>
      <h2 style={{ color: '#00ffc8' }}>Orders</h2>
      {orders.length === 0 ? (
        <p style={{ color: '#ccc' }}>No orders yet.</p>
      ) : (
        <ul>
          {orders.map((order) => (
            <li key={order._id} style={{ marginBottom: '1rem' }}>
              <div>
                <strong>{order.customerName}</strong> - ${order.total?.toFixed(2) || '0.00'}
              </div>
              {Array.isArray(order.items) && order.items.length > 0 ? (
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  {order.items.map((item, i) => (
                    <li key={i}>
                      {item.name} × {item.quantity || 1} - ${item.price?.toFixed(2) || '0.00'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'orange' }}>No items listed</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrdersPage;
