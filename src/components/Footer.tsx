import Logo from "@/components/Logo";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { companyProfileSocialLinks, type CompanyProfile } from "@/lib/company-profile";

export default function Footer({ companyProfile }: { companyProfile: CompanyProfile }) {
  const t = useTranslations("footer");
  const socialLinks = companyProfileSocialLinks(companyProfile);

  const footerLinks = {
    [t("columns.platform")]: [
      { label: t("links.browseExhibitions"), href: "/exhibitions" },
      { label: t("links.ourServices"), href: "/services" },
      { label: t("links.businessTours"), href: "/services/business-tours" },
      { label: t("links.chinaTours"), href: "/services/china-tours" },
      { label: t("links.events"), href: "/events" },
      { label: t("links.relocation"), href: "/relocation" },
      { label: t("links.exhibitorDirectory"), href: "/directory" },
      { label: t("links.rfqMarketplace"), href: "/marketplace" },
      { label: t("links.partnerProgram"), href: "/register" },
    ],
    [t("columns.company")]: [
      { label: t("links.aboutUs"), href: "/about" },
      { label: t("links.contact"), href: "/contact" },
      { label: t("links.careers"), href: "/careers" },
      { label: t("links.blog"), href: "/blog" },
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
          <form className="flex gap-2 w-full md:w-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder={t("emailPlaceholder")}
              className="flex-1 md:w-72 rounded-xl bg-[var(--color-footer-surface)] border border-[var(--color-footer-border)] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-gold-400 focus:ring-1 focus:ring-gold-400 outline-none transition-colors"
            />
            <button className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap">
              {t("subscribe")}
            </button>
          </form>
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
                  className="w-9 h-9 rounded-lg bg-[var(--color-footer-surface)] flex items-center justify-center text-sm text-gray-400 hover:bg-[var(--color-footer-border)] hover:text-white transition-colors"
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
        <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>{t("copyright", { year: new Date().getFullYear() })}</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">{t("privacyPolicy")}</Link>
            <Link href="/terms" className="hover:text-white transition-colors">{t("termsOfService")}</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">{t("cookiePolicy")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
