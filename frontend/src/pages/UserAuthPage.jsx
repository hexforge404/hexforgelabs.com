// frontend/src/pages/UserAuthPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { successToast, errorToast } from '../utils/toastUtils';
import './UserAuthPage.css';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 5000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const UserAuthPage = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [identifier, setIdentifier] = useState(''); // username or email for login
  const [username, setUsername] = useState('');     // for register
  const [email, setEmail] = useState('');           // for register
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const switchToLogin = () => {
    setMode('login');
    setError('');
  };

  const switchToRegister = () => {
    setMode('register');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'register') {
        // Create account
        const res = await api.post('/users/register', {
          username: username.trim(),
          email: email.trim(),
          password,
        });

        if (!res || res.status !== 201) {
          throw new Error('Registration failed');
        }

        successToast('Account created! You can sign in now.');
        // optional: auto-fill identifier with email
        setIdentifier(email.trim());
        setMode('login');
      } else {
        // Login
        const res = await api.post('/users/login', {
          identifier: identifier.trim(),
          password,
        });

        if (!res || res.status !== 200) {
          throw new Error('Login failed');
        }

        // Verify session
        const me = await api.get('/users/me');
        if (!me.data?.loggedIn) {
          throw new Error('Login did not stick. Please try again.');
        }

        successToast('Signed in!');
        // You can redirect to /account or just let the nav update
        window.location.href = '/account';
      }
    } catch (err) {
      console.error('User auth failed:', err);
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors &&
          err.response.data.errors.map((e) => e.msg).join(', ')) ||
        err.message ||
        'Something went wrong. Please try again.';
      setError(msg);
      errorToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="user-auth-page">
      <div className="user-auth-card">
        <h1 className="user-auth-title">
          {mode === 'login' ? 'Sign in to HexForge' : 'Create your HexForge account'}
        </h1>

        {error && <div className="user-auth-error">{error}</div>}

        <form className="user-auth-form" onSubmit={handleSubmit}>
          {mode === 'login' ? (
            <>
              <label className="user-auth-label">
                <span>Username or Email</span>
                <input
                  type="text"
                  className="user-auth-input"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label className="user-auth-label">
                <span>Username</span>
                <input
                  type="text"
                  className="user-auth-input"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>

              <label className="user-auth-label">
                <span>Email</span>
                <input
                  type="email"
                  className="user-auth-input"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </>
          )}

          <label className="user-auth-label">
            <span>Password</span>
            <input
              type="password"
              className="user-auth-input"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button
            type="submit"
            className="user-auth-button"
            disabled={submitting}
          >
            {submitting
              ? mode === 'login'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'login'
              ? '🔓 Sign In'
              : '🚀 Create Account'}
          </button>
        </form>

        <div className="user-auth-switch">
          {mode === 'login' ? (
            <>
              <span>New here?</span>
              <button type="button" onClick={switchToRegister}>
                Create an account
              </button>
            </>
          ) : (
            <>
              <span>Already have an account?</span>
              <button type="button" onClick={switchToLogin}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAuthPage;
