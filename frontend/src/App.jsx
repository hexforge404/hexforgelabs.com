import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { useCart } from 'context/CartContext';
import ProductList from 'components/ProductList';
import CartDrawer from 'components/CartDrawer';
import LoadingSpinner from 'components/LoadingSpinner';
import ErrorBoundary from 'components/ErrorBoundary';
import GlobalNav from 'components/GlobalNav';

import OrdersPage from 'pages/OrdersPage';
import AdminPage from 'pages/AdminPage';
import SuccessPage from 'pages/SuccessPage';
import LoginPage from 'pages/LoginPage';
import BlogPage from 'pages/BlogPage';
import HomePage from 'pages/HomePage';
import BlogPost from 'pages/BlogPost';
import ChatPage from 'pages/ChatPage';
import FloatingChatButton from 'components/FloatingChatButton';
import ScriptLabPage from 'pages/ScriptLabPage';
import MemoryPage from 'pages/MemoryPage';
import AssistantPage from 'pages/AssistantPage';

import { ToastContainer } from 'react-toastify';
import { errorToast } from './utils/toastUtils';

import './App.css';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 5000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

const useAuthCheck = () => {
  const [authState] = useState({
    isAuthenticated: true,
    loading: false,
    error: null
  });

  useEffect(() => {
    console.log('⚠️ Dev bypassing authentication');
  }, []);

  return authState;
};

const CartButton = React.memo(({ cart, toggleDrawer }) => (
  cart.length > 0 && (
    <button
      onClick={toggleDrawer}
      className="cart-button"
      aria-label={`Shopping Cart with ${cart.length} items`}
    >
      🛒 Cart
      <span className="cart-badge">{cart.length}</span>
    </button>
  )
));

CartButton.propTypes = {
  cart: PropTypes.array.isRequired,
  toggleDrawer: PropTypes.func.isRequired
};

const StorePage = ({ toggleDrawer, cart, isDrawerOpen }) => (
  <>
    <ProductList />
    <CartDrawer isOpen={isDrawerOpen} onClose={toggleDrawer} />
    <CartButton cart={cart} toggleDrawer={toggleDrawer} />
  </>
);

StorePage.propTypes = {
  toggleDrawer: PropTypes.func.isRequired,
  cart: PropTypes.array.isRequired,
  isDrawerOpen: PropTypes.bool.isRequired
};

const MainApp = () => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const { cart } = useCart();
  const { isAuthenticated, loading, error } = useAuthCheck();

  const toggleDrawer = () => setDrawerOpen(v => !v);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
      window.location.href = '/admin-login';
    } catch (err) {
      console.error('Logout failed', err);
      errorToast('Logout failed. Please try again.');
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (error) {
    return (
      <div className="auth-error-container">
        <h2>Authentication Check Failed</h2>
        <p>{error}</p>
        <div className="debug-info">
          <p>Technical Details:</p>
          <ul>
            <li>Endpoint: /api/auth/check</li>
            <li>Cookies: {document.cookie || 'None detected'}</li>
          </ul>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry Authentication
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <>
        <GlobalNav onLogout={handleLogout} />

        <div className="app-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/store"
              element={
                <StorePage
                  toggleDrawer={toggleDrawer}
                  cart={cart}
                  isDrawerOpen={isDrawerOpen}
                />
              }
            />
            <Route
              path="/orders"
              element={
                isAuthenticated ? <OrdersPage /> : <Navigate to="/" />
              }
            />
            <Route
              path="/admin"
              element={
                isAuthenticated ? (
                  <AdminPage />
                ) : (
                  <Navigate to="/admin-login" />
                )
              }
            />
            <Route path="/admin-login" element={<LoginPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/slug/:slug" element={<BlogPost />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/script-lab" element={<ScriptLabPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          pauseOnHover
          draggable
        />
        <FloatingChatButton />
      </>
    </ErrorBoundary>
  );
};

const App = () => (
  <Router>
    <MainApp />
  </Router>
);

export default App;
