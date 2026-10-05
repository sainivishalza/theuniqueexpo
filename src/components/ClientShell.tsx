"use client";

import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { AuthProvider } from "@/lib/auth-context";
import { CompanyProfileProvider } from "@/lib/company-profile-context";
import { GA_MEASUREMENT_ID_RE, type CompanyProfile } from "@/lib/company-profile";

export default function ClientShell({
  children,
  companyProfile,
  analyticsId,
}: {
  children: React.ReactNode;
  companyProfile: CompanyProfile;
  analyticsId: string;
}) {
  return (
    <CompanyProfileProvider profile={companyProfile}>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <NavBar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer companyProfile={companyProfile} analyticsEnabled={GA_MEASUREMENT_ID_RE.test(analyticsId)} />
          <WhatsAppButton number={companyProfile.whatsapp} />
        </div>
      </AuthProvider>
    </CompanyProfileProvider>
  );
}
