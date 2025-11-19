import React, { useState } from 'react';
import axios from 'axios';
import { successToast, errorToast } from '../utils/toastUtils';
import './LoginPage.css';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 5000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); // stop full page reload
    setError('');
    setSubmitting(true);

    try {
      // 1) Hit the login endpoint
      const res = await api.post('/auth/login', { username, password });

      if (!res || res.status !== 200) {
        throw new Error('Login failed');
      }

      // 2) Verify that the admin session is active
      const sessionRes = await api.get('/admin/session');

      if (!sessionRes.data?.loggedIn) {
        throw new Error('Login did not stick. Please try again.');
      }

      successToast('Login successful! Redirecting…');

      // 3) Force full reload so MainApp/useAuthCheck picks up the new session
      window.location.href = '/admin';
    } catch (err) {
      console.error('Admin login failed:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please check your credentials.';
      setError(msg);
      errorToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">HexForge Labs Admin</h1>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={submitting}
          >
            {submitting ? 'Logging in…' : '🔓 Log in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
