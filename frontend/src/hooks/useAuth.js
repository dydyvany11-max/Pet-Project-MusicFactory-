import { useState } from 'react';
import { loginUser, registerUser } from '../api/client';

export function useAuth(apiBaseUrl) {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('mf_user');
    return stored ? JSON.parse(stored) : null;
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

      setCurrentUser(user);
      localStorage.setItem('mf_user', JSON.stringify(user));
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
