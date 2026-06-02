import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('sb_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('sb_token'));

  useEffect(() => {
    if (token) localStorage.setItem('sb_token', token);
    else localStorage.removeItem('sb_token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('sb_user', JSON.stringify(user));
    else localStorage.removeItem('sb_user');
  }, [user]);

  const register = useCallback(async (email, password) => {
    const { token: t, user: u } = await authApi.register(email, password);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (email, password) => {
    const { token: t, user: u } = await authApi.login(email, password);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, setUser, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
