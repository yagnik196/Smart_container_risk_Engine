import React, { createContext, useEffect, useMemo, useState } from 'react';

const USERS_KEY = 'dashboardUsers';
const CURRENT_USER_KEY = 'dashboardCurrentUser';

const validateEmail = (email) => {
  // Basic email format validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const loadUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load users from localStorage', e);
    return [];
  }
};

const saveUsers = (users) => {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users to localStorage', e);
  }
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
    if (stored) setUser(stored);
  }, []);

  const isAuthenticated = useMemo(() => !!user, [user]);

  const login = (email, password) => {
    if (!email || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

    if (!validateEmail(email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const users = loadUsers();
    const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!matched) {
      return { success: false, message: 'No account found for this email.' };
    }

    if (matched.password !== password) {
      return { success: false, message: 'Incorrect password.' };
    }

    const authUser = { email: matched.email, name: matched.name || '' };
    setUser(authUser);
    saveCurrentUser(authUser);

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch (e) {
      console.error('Failed to remove current user from localStorage', e);
    }
  };

  const register = ({ name, email, password }) => {
    if (!name || !email || !password) {
      return { success: false, message: 'Name, email, and password are required.' };
    }

    if (!validateEmail(email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const users = loadUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const newUser = { name, email, password };
    const updated = [...users, newUser];
    saveUsers(updated);

    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
