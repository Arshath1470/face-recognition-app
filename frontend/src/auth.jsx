import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from './api.js';

const KEY = 'facefinder.token';
const AuthContext = createContext(null);

const storage = {
  get: () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      if (token) localStorage.setItem(KEY, token);
      else localStorage.removeItem(KEY);
    } catch {
      // private mode: session lasts until the tab closes
    }
  },
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(storage.get);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(storage.get()));

  const signOut = useCallback(() => {
    storage.set(null);
    setToken(null);
    setUser(null);
  }, []);

  const accept = useCallback((session) => {
    storage.set(session.token);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const request = useCallback(
    async (path, options = {}) => {
      try {
        return await api(path, { ...options, token });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) signOut();
        throw error;
      }
    },
    [token, signOut],
  );

  const refreshProfile = useCallback(() => request('/api/me').then(setUser), [request]);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    refreshProfile()
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [token, refreshProfile]);

  const value = useMemo(
    () => ({
      token,
      user,
      checking,
      request,
      refreshProfile,
      signOut,
      signIn: (email, password) => api('/api/auth/login', { method: 'POST', body: { email, password } }).then(accept),
      register: (form) => api('/api/auth/register', { method: 'POST', body: form }).then(accept),
    }),
    [token, user, checking, request, refreshProfile, signOut, accept],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
