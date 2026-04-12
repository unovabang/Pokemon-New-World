import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { credentialsInit } from '../utils/authHeaders';

const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, credentialsInit());
      const data = await res.json();
      if (data.success) setAdmin(data.admin);
      else setAdmin(null);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, credentialsInit({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }));
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Connexion échouée');
    setAdmin(data.admin);
    return data;
  };

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, credentialsInit({ method: 'POST' }));
    } catch { /* ignore */ }
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
