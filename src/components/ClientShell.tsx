"use client";

import { useTranslations } from "next-intl";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import HelpWidget from "@/components/HelpWidget";
import { usePathname } from "@/i18n/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { CompanyProfileProvider } from "@/lib/company-profile-context";
import { shellAppliesTo, shellAreaOf } from "@/lib/app-shell";
import type { NavSections } from "@/lib/server/nav-sections";
import { GA_MEASUREMENT_ID_RE, type CompanyProfile } from "@/lib/company-profile";

function Frame({
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
  const pathname = usePathname();
  const { user, loading } = useAuth();
  // In the admin and dashboard areas the dashboard frame (see AppShell) replaces the
  // website's top bar and footer. While the session is still loading neither is shown
  // there, so the page does not flash one and then swap to the other.
  const area = shellAreaOf(pathname);
  const inApp = shellAppliesTo(area, user);
  const showChrome = !area || (!loading && !inApp);
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-button)] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-900 focus:shadow-lg"
      >
        {t("skipToContent")}
      </a>
      {showChrome && <NavBar sections={navSections} />}
      {inApp ? (
        // The dashboard frame supplies its own <main> (next to its side list), so the
        // skip link lands on the page itself rather than on the menu.
        <div className="flex-1">{children}</div>
      ) : (
        <main id="main-content" tabIndex={-1} className={`flex-1 focus:outline-none ${showChrome ? "pt-16" : ""}`}>{children}</main>
      )}
      {showChrome && <Footer companyProfile={companyProfile} analyticsEnabled={GA_MEASUREMENT_ID_RE.test(analyticsId)} sections={navSections} />}
      {!inApp && <HelpWidget number={companyProfile.whatsapp} wechatQrVersion={companyProfile.wechatQrVersion} wechatId={companyProfile.wechatId} />}
    </div>
  );
}

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
  return (
    <CompanyProfileProvider profile={companyProfile}>
      <AuthProvider>
        <Frame companyProfile={companyProfile} analyticsId={analyticsId} navSections={navSections}>{children}</Frame>
      </AuthProvider>
    </CompanyProfileProvider>
  );
}
