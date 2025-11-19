import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { successToast, errorToast } from '../utils/toastUtils';

const RegisterPage = () => {
  const { register } = useUser();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await register(username, email, password);
      successToast('Account created!');
      nav('/');
    } catch (err) {
      errorToast(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Create Account</h1>

        <form onSubmit={submit}>
          <label>Username
            <input value={username} onChange={e => setUsername(e.target.value)} />
          </label>

          <label>Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>

          <label>Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>

          <button type="submit" className="login-button">
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
