import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { successToast, errorToast } from '../utils/toastUtils';

const UserLoginPage = () => {
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      successToast('Logged in!');
      nav('/');
    } catch (err) {
      errorToast(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Member Login</h1>

        <form onSubmit={submit}>
          <label>Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>

          <label>Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>

          <button className="login-button">Log In</button>
        </form>
      </div>
    </div>
  );
};

export default UserLoginPage;
