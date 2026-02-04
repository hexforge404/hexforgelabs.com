import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { CartProvider } from 'context/CartContext';
import AdminProvider from 'context/AdminContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AdminProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AdminProvider>
  </React.StrictMode>
);

reportWebVitals();
