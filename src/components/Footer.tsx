import Logo from "@/components/Logo";
import NewsletterForm from "@/components/NewsletterForm";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { companyProfileSocialLinks, type CompanyProfile } from "@/lib/company-profile";
import { openCookieSettings } from "@/lib/cookie-consent";
import { SHOW_TEAM } from "@/lib/feature-flags";

export default function Footer({
  companyProfile,
  analyticsEnabled,
}: {
  companyProfile: CompanyProfile;
  analyticsEnabled: boolean;
}) {
  const t = useTranslations("footer");
  const socialLinks = companyProfileSocialLinks(companyProfile);

  const footerLinks = {
    [t("columns.platform")]: [
      { label: t("links.browseExhibitions"), href: "/exhibitions" },
      { label: t("links.ourServices"), href: "/services" },
      { label: t("links.businessTours"), href: "/business-tours" },
      { label: t("links.chinaTours"), href: "/tours" },
      { label: t("links.events"), href: "/events" },
      { label: t("links.relocation"), href: "/relocation" },
      { label: t("links.exhibitorDirectory"), href: "/directory" },
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
      { label: t("links.magazine"), href: "/magazine" },
      { label: t("links.videos"), href: "/videos" },
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
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
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
          <span>{t("copyright", { year: new Date().getFullYear() })}</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">{t("privacyPolicy")}</Link>
            <Link href="/terms" className="hover:text-white transition-colors">{t("termsOfService")}</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">{t("cookiePolicy")}</Link>
            {analyticsEnabled && (
              <button type="button" onClick={openCookieSettings} className="hover:text-white transition-colors">
                {t("cookieSettings")}
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
