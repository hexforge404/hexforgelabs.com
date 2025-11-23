// frontend/src/pages/AccountPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LoadingSpinner from 'components/LoadingSpinner';
import './AccountPage.css';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 5000
});

const AccountPage = () => {
  const [state, setState] = useState({
    loading: true,
    error: null,
    user: null
  });

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get('/users/me');
        if (res.data?.loggedIn) {
          setState({ loading: false, error: null, user: res.data.user });
        } else {
          setState({
            loading: false,
            error: 'You are not logged in.',
            user: null
          });
        }
      } catch (err) {
        console.error('Failed to load account:', err);
        setState({
          loading: false,
          error: 'Failed to load account details',
          user: null
        });
      }
    };

    fetchMe();
  }, []);

  if (state.loading) {
    return <LoadingSpinner fullPage />;
  }

  if (state.error) {
    return (
      <div className="account-page">
        <div className="account-card">
          <h2 className="account-title">HexForge Account</h2>
          <p className="account-error">{state.error}</p>
        </div>
      </div>
    );
  }

  const { user } = state;
  const created =
    user?.createdAt && new Date(user.createdAt).toLocaleDateString();

  return (
    <div className="account-page">
      <div className="account-card">
        <h2 className="account-title">HexForge Account</h2>
        <p>
          <strong>Username</strong> {user.username}
        </p>
        <p>
          <strong>Email</strong> {user.email}
        </p>
        {created && (
          <p>
            <strong>Member since</strong> {created}
          </p>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
