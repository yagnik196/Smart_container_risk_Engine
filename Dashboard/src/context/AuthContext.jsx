import React, { createContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService';

const CURRENT_USER_KEY = 'dashboardCurrentUser';

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const loadCurrentUser = () => {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to load current user from localStorage', e);
    return null;
  }
};

const saveCurrentUser = (user) => {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save current user to localStorage', e);
  }
};

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = loadCurrentUser();
    if (stored && stored.access) {
      setUser(stored);
    } else {
      setUser(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => !!user, [user]);

  const login = async (email, password) => {
    if (!email || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

    if (!validateEmail(email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    try {
      // Backend uses 'username' and 'password' for login
      const response = await authService.login(email, password);

      if (response.data && response.data.tokens) {
        const authUser = {
          email: email,
          name: response.data.user?.username || email,
          access: response.data.tokens.access,
          refresh: response.data.tokens.refresh,
        };
        setUser(authUser);
        saveCurrentUser(authUser);
        return { success: true };
      } else {
        return { success: false, message: 'Unexpected response format from server.' };
      }
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || 'Login failed. Please check your credentials.';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch (e) {
      console.error('Failed to remove current user from localStorage', e);
    }
  };

  const register = async ({ name, email, password }) => {
    if (!name || !email || !password) {
      return { success: false, message: 'Name, email, and password are required.' };
    }

    if (!validateEmail(email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    if (password.length < 8) {
      return { success: false, message: 'Password must be at least 8 characters long.' };
    }

    try {
      const response = await authService.register(email, email, password);

      if (response.status === 201) {
        return { success: true };
      } else {
        return { success: false, message: 'Registration failed.' };
      }
    } catch (error) {
      const data = error.response?.data || {};
      const msg = data.email?.[0] || data.username?.[0] || data.password?.[0] || data.error || 'Registration failed.';
      return { success: false, message: msg };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
