"use client";

import { useAuth, type UserRole } from "@/lib/auth-context";

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === "admin";
}

// Extend UserRole to include admin (mock only)
export function promoteToAdmin(): void {
  // In real app this would be a Supabase RPC call
  // For mock purposes, we store admin IDs
}

export const ADMIN_EMAILS = ["admin@expobridge.com", "staff@expobridge.com"];
