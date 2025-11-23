// frontend/src/pages/UserAuthPage.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { errorToast, successToast } from '../utils/toastUtils';
import './UserAuthPage.css';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 5000
});

const UserAuthPage = ({ onAuth }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const resetFields = () => {
    setPassword('');
  };

  const handleLogin = async e => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const body = identifier.includes('@')
        ? { email: identifier, password }
        : { username: identifier, password };

      const res = await api.post('/users/login', body);
      successToast('Signed in successfully');

      if (res.data?.user) {
        onAuth?.(res.data.user);
      }

      resetFields();
      navigate('/account');
    } catch (err) {
      console.error('User login failed:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Login failed';
      errorToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async e => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.post('/users/register', {
        username,
        email,
        password
      });

      successToast('Account created! You can now sign in.');

      if (res.data?.user) {
        onAuth?.(res.data.user);
      }

      resetFields();
      navigate('/account');
    } catch (err) {
      console.error('User registration failed:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Registration failed';
      errorToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">
          {isLogin ? 'Sign in to HexForge' : 'Create a HexForge Account'}
        </h2>

        {isLogin ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-field">
              <label>Username or Email</label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : '🔒 Sign In'}
            </button>

            <p className="auth-toggle">
              New here?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="auth-toggle-link"
              >
                Create an account
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="auth-field">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={submitting}
            >
              {submitting ? 'Creating account...' : '🚀 Create Account'}
            </button>

            <p className="auth-toggle">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="auth-toggle-link"
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

UserAuthPage.propTypes = {
  onAuth: PropTypes.func
};

export default UserAuthPage;
