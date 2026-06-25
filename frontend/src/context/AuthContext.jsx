import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('kissan_auth_user');
    return cached ? JSON.parse(cached) : null;
  });

  const login = async (role, identifier, password) => {
    try {
      const res = await api.login(role, identifier, password);
      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem('kissan_auth_user', JSON.stringify(res.user));
        return { success: true };
      }
      return { success: false, error: 'Failed to retrieve user profile' };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (registrationData) => {
    try {
      const res = await api.register(registrationData);
      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem('kissan_auth_user', JSON.stringify(res.user));
        return { success: true };
      }
      return { success: false, error: 'Failed to create user profile' };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kissan_auth_user');
  };

  const updateVerification = async (updates) => {
    setUser(prev => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updates };
      localStorage.setItem('kissan_auth_user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const refreshUser = async () => {
    if (!user || !user.id) return;
    try {
      const res = await api.me(user.id);
      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem('kissan_auth_user', JSON.stringify(res.user));
      }
    } catch (err) {
      console.error("Failed to refresh user profile status:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateVerification, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
