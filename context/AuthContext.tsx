'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'admin' | 'vendedor' | 'operador' | 'public';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'vendedor' | 'operador';
  status: string;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole;
  isLoggedIn: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  pricingMode: 'public' | 'role';
  setPricingMode: (mode: 'public' | 'role') => void;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: AuthUser; redirect?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'pf_cached_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pricingMode, setPricingMode] = useState<'public' | 'role'>('role');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Leer sesión guardada en localStorage para evitar parpadeos
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.role) {
          setUser(parsed);
        }
      }
    } catch {}
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.user));
        } catch {}
      } else {
        setUser(null);
        try {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch {}
      }
    } catch (e) {
      console.warn('Error fetching auth session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        setPricingMode('role');
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.user));
        } catch {}
        return { success: true, user: data.user, redirect: data.redirect };
      } else {
        return { success: false, error: data.error || 'Credenciales inválidas' };
      }
    } catch (err: any) {
      return { success: false, error: 'Error de conexión con el servidor' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
  };

  const role: UserRole = user ? user.role : 'public';
  const isLoggedIn = !!user;
  const isSeller = user?.role === 'vendedor';
  const isAdmin = user?.role === 'admin';
  const isOperator = user?.role === 'operador';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoggedIn,
        isSeller,
        isAdmin,
        isOperator,
        pricingMode,
        setPricingMode,
        isLoading,
        login,
        logout,
        refreshSession,
        isLoginModalOpen,
        setIsLoginModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
