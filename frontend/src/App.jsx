// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
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
import CustomOrderSuccessPage from 'pages/CustomOrderSuccessPage';
import LoginPage from 'pages/LoginPage';          // admin login
import BlogPage from 'pages/BlogPage';
import HomePage from 'pages/HomePage';
import BlogPost from 'pages/BlogPost';
import AdminWorkOrderPrintPage from 'pages/AdminWorkOrderPrintPage';
import ChatPage from 'pages/ChatPage';
import FloatingChatButton from 'components/FloatingChatButton';
import MemorialGuide from 'components/MemorialGuide';
import ScriptLabPage from 'pages/ScriptLabPage';
import MemoryPage from 'pages/MemoryPage';
import AssistantPage from 'pages/AssistantPage';
import SurfacePage from "./pages/SurfacePage";

import UserAuthPage from 'pages/UserAuthPage';    // ✅ member login/register
import AccountPage from 'pages/AccountPage';      // ✅ member account

import { ToastContainer } from 'react-toastify';
import { errorToast, successToast } from './utils/toastUtils';
import HeightmapPage from "./pages/HeightmapPage";
import ProductDetailPage from 'pages/ProductDetailPage';
import OrderStatusPage from 'pages/OrderStatusPage';
import FuneralHomePage from './pages/FuneralHomePage';
import MemorialPage from './pages/MemorialPage';

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

const DEV_BYPASS_ADMIN =
  process.env.NODE_ENV === 'development' &&
  process.env.REACT_APP_DEV_BYPASS_ADMIN === 'true';

const useAdminAuthCheck = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (DEV_BYPASS_ADMIN) {
          console.warn('⚠️ Dev bypassing admin authentication');
          setAuthState({
            isAuthenticated: true,
            loading: false,
            error: null
          });
          return;
        }

        const res = await api.get('/admin/session');

        if (res.data?.loggedIn) {
          setAuthState({
            isAuthenticated: true,
            loading: false,
            error: null
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            loading: false,
            error: null
          });
        }
      } catch (err) {
        console.error('Admin auth check failed:', err);
        setAuthState({
          isAuthenticated: false,
          loading: false,
          error: 'Failed to verify admin session'
        });
      }
    };

    checkAuth();
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

const AdminRoute = ({ isAuthenticated, loading, children }) => {
  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return isAuthenticated ? children : <Navigate to="/admin-login" replace />;
};

AdminRoute.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired
};

const MainApp = () => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const { cart } = useCart();

  // ✅ admin session
  const { isAuthenticated, loading: adminLoading } = useAdminAuthCheck();

  // ✅ member session
  const [member, setMember] = useState(null);
  const [memberLoaded, setMemberLoaded] = useState(false);
  const location = useLocation();
  const memorialGuideSource =
    location.pathname === '/funeral-homes'
      ? 'funeralHomes'
      : location.pathname === '/memorial'
        ? 'memorial'
        : null;

  const toggleDrawer = () => setDrawerOpen(v => !v);

  const loadMember = async () => {
    try {
      const res = await api.get('/users/me');
      if (res.data?.loggedIn) {
        setMember(res.data.user);
      } else {
        setMember(null);
      }
    } catch (err) {
      console.error('Member session check failed:', err);
      setMember(null);
    } finally {
      setMemberLoaded(true);
    }
  };

  useEffect(() => {
    loadMember();
  }, []);

  const handleAdminLogout = async () => {
    try {
      await api.post('/auth/logout', {});
      successToast('Admin logged out');
      window.location.href = '/admin-login';
    } catch (err) {
      console.error('Admin logout failed', err);
      errorToast('Admin logout failed. Please try again.');
    }
  };

  const handleMemberLogout = async () => {
    try {
      await api.post('/users/logout', {});
      successToast('Logged out');
      setMember(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Member logout failed', err);
      errorToast('Logout failed. Please try again.');
    }
  };

  if (!memberLoaded) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <ErrorBoundary>
      <>
        <GlobalNav
          onLogout={handleAdminLogout}
          member={member}
          onMemberLogout={handleMemberLogout}
        />

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

            <Route path="/store/:slug" element={<ProductDetailPage />} />
            <Route path="/order/:orderId" element={<OrderStatusPage />} />

            {/* Admin side */}
            <Route
              path="/orders"
              element={
                <AdminRoute isAuthenticated={isAuthenticated} loading={adminLoading}>
                  <OrdersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute isAuthenticated={isAuthenticated} loading={adminLoading}>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/work-order/:orderId"
              element={
                <AdminRoute isAuthenticated={isAuthenticated} loading={adminLoading}>
                  <AdminWorkOrderPrintPage />
                </AdminRoute>
              }
            />
            <Route path="/admin-login" element={<LoginPage />} />

            {/* Public site */}
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/custom-order-success" element={<CustomOrderSuccessPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/slug/:slug" element={<BlogPost />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/script-lab" element={<ScriptLabPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/heightmap" element={<HeightmapPage />} />
            <Route path="/surface" element={<SurfacePage />} />

            {/* Member accounts */}
            <Route
              path="/login"
              element={<UserAuthPage onAuth={setMember} />}
            />
            <Route
              path="/register"
              element={<UserAuthPage onAuth={setMember} initialMode="register" />}
            />
            <Route
              path="/account"
              element={
                member ? <AccountPage /> : <Navigate to="/login" replace />
              }
            />

            <Route path="/funeral-homes" element={<FuneralHomePage />} />
            <Route path="/memorial" element={<MemorialPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          pauseOnHover
          draggable
        />
        {memorialGuideSource ? (
          <MemorialGuide key={memorialGuideSource} pageSource={memorialGuideSource} />
        ) : (
          <FloatingChatButton />
        )}
      </>
    </ErrorBoundary>
  );
};

const App = () => (
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <MainApp />
  </Router>
);

export default App;
