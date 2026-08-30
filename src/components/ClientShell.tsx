"use client";

import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth-context";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
