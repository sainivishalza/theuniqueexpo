"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// "visitor" used to be a separate role/dashboard from "buyer" -- merged into
// a single "buyer" role site-wide (one signup option, one dashboard) since
// the two were never meaningfully different in practice.
export type UserRole = "buyer" | "exhibitor" | "partner" | "admin";

export interface MockUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  country: string;
}

/** The second sign-in step was refused; `code` is `wrong_code`, `expired` or `rate_limited`. */
export class SecondStepError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

interface AuthContextValue {
  user: MockUser | null;
  loading: boolean;
  /** Signs in. For an admin with two-step sign-in on, resolves with the pass to give to `loginWithCode`. */
  login: (email: string, password: string) => Promise<{ challenge: string } | null>;
  loginWithCode: (challenge: string, code: string) => Promise<{ usedRecoveryCode: boolean }>;
  register: (name: string, email: string, password: string, role: UserRole, country: string, ref?: string, invite?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: MockUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    if (data.needsSecondStep) return { challenge: data.challenge as string };
    setUser(data.user);
    return null;
  }, []);

  const loginWithCode = useCallback(async (challenge: string, code: string) => {
    const res = await fetch("/api/auth/login/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new SecondStepError(data.code || "failed");
    setUser(data.user);
    return { usedRecoveryCode: !!data.usedRecoveryCode };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole, country: string, ref?: string, invite?: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, country, ref, invite }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, loginWithCode, register, logout, setUser }),
    [user, loading, login, loginWithCode, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
