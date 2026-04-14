import { useState } from 'react';
import { loginUser, registerUser } from '../api/client';

export function useAuth(apiBaseUrl) {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('mf_user');
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    return { ...parsed, is_admin: Boolean(parsed?.is_admin) };
  });
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    login: '',
    password: '',
  });

  const submitAuth = async () => {
    setAuthError('');

    try {
      let user;
      if (authMode === 'register') {
        user = await registerUser(apiBaseUrl, {
          username: authForm.username,
          email: authForm.email,
          password: authForm.password,
        });
      } else {
        user = await loginUser(apiBaseUrl, {
          login: authForm.login || authForm.email || authForm.username,
          password: authForm.password,
        });
      }

      const normalizedUser = { ...user, is_admin: Boolean(user?.is_admin) };
      setCurrentUser(normalizedUser);
      localStorage.setItem('mf_user', JSON.stringify(normalizedUser));
      setAuthForm({ username: '', email: '', login: '', password: '' });
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mf_user');
  };

  return {
    currentUser,
    setCurrentUser,
    authMode,
    setAuthMode,
    authError,
    setAuthError,
    authForm,
    setAuthForm,
    submitAuth,
    logout,
  };
}
