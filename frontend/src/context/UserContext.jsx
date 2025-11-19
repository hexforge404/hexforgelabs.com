import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-fetch current user session
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/users/me');
        if (res.data.loggedIn) {
          setUser(res.data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/users/login', { email, password });
    if (res.data?.user) setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await api.post('/users/logout');
    setUser(null);
  };

  const register = async (username, email, password) => {
    const res = await api.post('/users/register', {
      username, email, password
    });
    if (res.data?.user) setUser(res.data.user);
    return res.data;
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
