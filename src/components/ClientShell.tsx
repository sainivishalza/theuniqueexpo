"use client";

import { useTranslations } from "next-intl";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { AuthProvider } from "@/lib/auth-context";
import { CompanyProfileProvider } from "@/lib/company-profile-context";
import type { NavSections } from "@/lib/server/nav-sections";
import { GA_MEASUREMENT_ID_RE, type CompanyProfile } from "@/lib/company-profile";

export default function ClientShell({
  children,
  companyProfile,
  analyticsId,
  navSections,
}: {
  children: React.ReactNode;
  companyProfile: CompanyProfile;
  analyticsId: string;
  navSections: NavSections;
}) {
  const t = useTranslations("common");
  return (
    <CompanyProfileProvider profile={companyProfile}>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-button)] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-900 focus:shadow-lg"
          >
            {t("skipToContent")}
          </a>
          <NavBar sections={navSections} />
          <main id="main-content" tabIndex={-1} className="flex-1 pt-16 focus:outline-none">{children}</main>
          <Footer companyProfile={companyProfile} analyticsEnabled={GA_MEASUREMENT_ID_RE.test(analyticsId)} sections={navSections} />
          <WhatsAppButton number={companyProfile.whatsapp} />
        </div>
      </AuthProvider>
    </CompanyProfileProvider>
  );
}
