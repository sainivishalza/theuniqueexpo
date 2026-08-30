"use client";

import { AuthProvider } from "@/lib/auth-context";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavBar />
      <div className="min-h-[calc(100vh-52px)]">{children}</div>
      <Footer />
    </AuthProvider>
  );
}
