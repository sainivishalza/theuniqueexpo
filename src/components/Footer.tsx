import { useSyncExternalStore } from "react";
import type { NavSections } from "@/lib/server/nav-sections";
import Logo from "@/components/Logo";
import NewsletterForm from "@/components/NewsletterForm";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { companyProfileSocialLinks, telHref, type CompanyProfile } from "@/lib/company-profile";
import { openCookieSettings } from "@/lib/cookie-consent";
import { SHOW_TEAM } from "@/lib/feature-flags";

// The pages are pre-built, so a plain new Date() here would freeze the year at
// build time. The server snapshot is that build-time year (so hydration
// matches); in the browser it switches to the visitor's current year.
const BUILD_YEAR = new Date().getFullYear();
const subscribeNoop = () => () => {};
function useCurrentYear() {
  return useSyncExternalStore(subscribeNoop, () => new Date().getFullYear(), () => BUILD_YEAR);
}

export default function Footer({
  companyProfile,
  analyticsEnabled,
  sections,
}: {
  companyProfile: CompanyProfile;
  analyticsEnabled: boolean;
  sections: NavSections;
}) {
  const t = useTranslations("footer");
  const socialLinks = companyProfileSocialLinks(companyProfile);
  const year = useCurrentYear();

  const footerLinks = {
    [t("columns.platform")]: [
      { label: t("links.browseExhibitions"), href: "/exhibitions" },
      { label: t("links.ourServices"), href: "/services" },
      { label: t("links.businessTours"), href: "/business-tours" },
      { label: t("links.chinaTours"), href: "/tours" },
      ...(sections.events ? [{ label: t("links.events"), href: "/events" }] : []),
      { label: t("links.relocation"), href: "/relocation" },
      { label: t("links.rfqMarketplace"), href: "/marketplace" },
      { label: t("links.partnerProgram"), href: "/partner-program" },
      { label: t("links.conferenceHosting"), href: "/services/conference-forum-hosting" },
    ],
    [t("columns.company")]: [
      { label: t("links.aboutUs"), href: "/about" },
      ...(SHOW_TEAM ? [{ label: t("links.ourTeam"), href: "/about#team" }] : []),
      { label: t("links.contact"), href: "/contact" },
      { label: t("links.careers"), href: "/careers" },
      { label: t("links.blog"), href: "/blog" },
      ...(sections.magazine ? [{ label: t("links.magazine"), href: "/magazine" }] : []),
      ...(sections.videos ? [{ label: t("links.videos"), href: "/videos" }] : []),
      { label: t("links.cityPartnerships"), href: "/city-partnerships" },
    ],
    [t("columns.resources")]: [
      { label: t("links.helpCenter"), href: "/help" },
      { label: t("links.exhibitionGuide"), href: "/exhibition-guide" },
      { label: t("links.boothSetupTips"), href: "/booth-setup-tips" },
      { label: t("links.costEstimator"), href: "/services/relocation-cost-estimator" },
      { label: t("links.apiDocumentation"), href: "/api-documentation" },
    ],
  };

  return (
    <footer className="bg-[var(--color-footer-bg)] text-gray-300">
      {/* Newsletter */}
      <div className="border-b border-[var(--color-footer-border)]">
        <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white">{t("newsletterTitle")}</h3>
            <p className="text-sm text-gray-400 mt-1">{t("newsletterSubtitle")}</p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      {/* Links */}
      <div className="mx-auto max-w-7xl px-6 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
        {/* Brand */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <Logo size="default" />
          </div>
          <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
            {t("brandBlurb")}
          </p>
          {(companyProfile.contactEmail || companyProfile.phone) && (
            <ul className="mt-4 text-sm text-gray-400">
              {companyProfile.contactEmail && (
                <li>
                  <a href={`mailto:${companyProfile.contactEmail}`} className="inline-block py-1.5 hover:text-white transition-colors break-all">
                    {companyProfile.contactEmail}
                  </a>
                </li>
              )}
              {companyProfile.phone && telHref(companyProfile.phone) && (
                <li>
                  <a href={telHref(companyProfile.phone)} className="inline-block py-1.5 hover:text-white transition-colors">
                    {companyProfile.phone}
                  </a>
                </li>
              )}
            </ul>
          )}
          {/* Social icons -- only rendered for links the admin has actually configured */}
          {socialLinks.length > 0 && (
            <div className="flex gap-3 mt-5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-[var(--radius-icon-sm)] bg-[var(--color-footer-surface)] flex items-center justify-center text-sm text-gray-400 hover:bg-[var(--color-footer-border)] hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h4 className="text-sm font-bold text-white mb-4">{title}</h4>
            <ul>
              {links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="inline-block py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--color-footer-border)]">
        <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <span>{t("copyright", { year })}</span>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link href="/privacy" className="inline-block py-1.5 hover:text-white transition-colors">{t("privacyPolicy")}</Link>
            <Link href="/terms" className="inline-block py-1.5 hover:text-white transition-colors">{t("termsOfService")}</Link>
            <Link href="/cookies" className="inline-block py-1.5 hover:text-white transition-colors">{t("cookiePolicy")}</Link>
            {analyticsEnabled && (
              <button type="button" onClick={openCookieSettings} className="py-1.5 hover:text-white transition-colors">
                {t("cookieSettings")}
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
