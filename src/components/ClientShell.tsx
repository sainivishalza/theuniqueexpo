"use client";

import { AuthProvider } from "@/lib/auth-context";
import NavBar from "@/components/NavBar";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavBar />
      {children}
    </AuthProvider>
  );
}
