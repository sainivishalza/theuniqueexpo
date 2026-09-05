"use client";

import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth-context";
import type { CompanyProfile } from "@/lib/company-profile";

export default function ClientShell({
  children,
  companyProfile,
}: {
  children: React.ReactNode;
  companyProfile: CompanyProfile;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer companyProfile={companyProfile} />
      </div>
    </AuthProvider>
  );
}
