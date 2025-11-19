// frontend/src/pages/AccountPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AccountPage.css';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 5000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const AccountPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUser = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/users/me');
      if (res.data?.loggedIn) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setError('Could not load your account. Please try again.');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="account-page">
        <div className="account-card">
          <p>Loading your account…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="account-page">
        <div className="account-card">
          <h1 className="account-title">HexForge Account</h1>
          <p>You’re not signed in.</p>
          <p>
            <a href="/login" className="account-link">
              Go to the Sign In page
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-card">
        <h1 className="account-title">HexForge Account</h1>

        {error && <div className="account-error">{error}</div>}

        <div className="account-field">
          <span className="account-label">Username</span>
          <span className="account-value">{user.username}</span>
        </div>

        <div className="account-field">
          <span className="account-label">Email</span>
          <span className="account-value">{user.email}</span>
        </div>

        {user.createdAt && (
          <div className="account-field">
            <span className="account-label">Member since</span>
            <span className="account-value">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
