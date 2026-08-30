"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type UserRole = "buyer" | "exhibitor" | "visitor" | "partner";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  country: string;
}

interface AuthContextValue {
  user: MockUser | null;
  loading: boolean;
  login: (email: string, role: UserRole) => void;
  register: (name: string, email: string, role: UserRole, country: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback((email: string, role: UserRole) => {
    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      setUser({ id: "mock-1", name: "Test User", email, role, country: "" });
      setLoading(false);
    }, 500);
  }, []);

  const register = useCallback((name: string, email: string, role: UserRole, country: string) => {
    setLoading(true);
    setTimeout(() => {
      setUser({ id: "mock-1", name, email, role, country });
      setLoading(false);
    }, 500);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
