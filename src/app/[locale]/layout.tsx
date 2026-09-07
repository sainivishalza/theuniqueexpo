import type { Metadata } from "next";
import {
  Inter, Manrope, Montserrat, Open_Sans,
  Oswald, Bebas_Neue, Anton, Roboto_Condensed, Archivo_Narrow,
  Caveat, Dancing_Script, Pacifico,
} from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import "./globals.css";
import ClientShell from "@/components/ClientShell";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import OrganizationSchema from "@/components/OrganizationSchema";
import { routing } from "@/i18n/routing";
import { getCompanyProfile } from "@/lib/server/company-profile-repo";
import { getSiteTheme } from "@/lib/server/site-theme-repo";
import { headingFontStack, bodyFontStack, scriptFontStack, cornerRadii } from "@/lib/site-theme";
import { generateScale, deriveTints } from "@/lib/theme-colors";
import { ADMIN_NAMESPACES, DASHBOARD_NAMESPACES, omitMessages } from "@/lib/client-message-namespaces";

// Every font an admin can pick from (see src/lib/site-theme.ts) is self-
// hosted at build time, same as the original Inter -- next/font requires
// a static import per font, so the full catalog loads regardless of which
// one is currently selected. Each only exposes its CSS variable; picking
// one costs nothing extra over another since a browser only ever fetches
// the @font-face files actually referenced by rendered text.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], display: "swap", variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-manrope" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-montserrat" });
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-open-sans" });

const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--font-oswald" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-bebas-neue" });
const anton = Anton({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-anton" });
const robotoCondensed = Roboto_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--font-roboto-condensed" });
const archivoNarrow = Archivo_Narrow({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--font-archivo-narrow" });

const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600"], display: "swap", variable: "--font-caveat" });
const dancingScript = Dancing_Script({ subsets: ["latin"], weight: ["500", "600"], display: "swap", variable: "--font-dancing-script" });
const pacifico = Pacifico({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-pacifico" });

const FONT_VARIABLES = [
  inter, manrope, montserrat, openSans,
  oswald, bebasNeue, anton, robotoCondensed, archivoNarrow,
  caveat, dancingScript, pacifico,
].map((f) => f.variable).join(" ");

const SITE_URL = "https://www.theuniqueexpo.com";
const SITE_NAME = "The Unique Expo";
const DEFAULT_DESCRIPTION =
  "Discover Something Unique Together — The world's leading B2B exhibition, trade-fair & sourcing platform connecting buyers with exhibitors worldwide.";

// Per-page canonical + hreflang alternates without touching every one of
// the ~70+ individual page files: the sitemap already carries hreflang
// alternates, but search engines primarily read canonical/hreflang from
// the page <head>, and that was entirely absent there -- risking en/ru/zh
// being treated as duplicate content. middleware.ts forwards the current
// request path (locale prefix included) via an x-pathname header, since a
// layout Server Component has no other way to know the current URL;
// individual pages' own generateMetadata (title/description/og:image)
// still take precedence and are merged with this, per Next's metadata
// resolution.
async function localeAlternates() {
  const pathname = (await headers()).get("x-pathname") || "/en";
  const withoutLocale = pathname.replace(/^\/(en|ru|zh)(?=\/|$)/, "") || "/";
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${SITE_URL}/${locale}${withoutLocale === "/" ? "" : withoutLocale}`;
  }
  return {
    canonical: `${SITE_URL}${pathname}`,
    languages: { ...languages, "x-default": languages[routing.defaultLocale] },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${SITE_NAME} — Discover Something Unique Together`,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    alternates: await localeAlternates(),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Discover Something Unique Together`,
      description: DEFAULT_DESCRIPTION,
      url: SITE_URL,
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — Discover Something Unique Together`,
      description: DEFAULT_DESCRIPTION,
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const [rawMessages, companyProfile, siteTheme] = await Promise.all([
    getMessages(),
    getCompanyProfile(),
    getSiteTheme(),
  ]);
  // Admin/dashboard-only namespaces (~38% of the whole bundle) are added
  // back by their own nested providers in admin/layout.tsx and
  // dashboard/layout.tsx -- every other page doesn't need them at all.
  const messages = omitMessages(rawMessages, [...ADMIN_NAMESPACES, ...DASHBOARD_NAMESPACES]);

  // Admin-controlled colors/fonts (src/app/admin/site-theme) as an inline
  // style on <html>: an inline style beats the static hex/font-stack
  // fallbacks declared in globals.css's `@theme`/`h1..h6` rules, so every
  // bg/text/border/shadow-emerald-*, gold-*, cream-* utility and every
  // heading/body/script font sitewide picks up the admin's choice with no
  // rebuild -- while a site with no saved theme row still renders exactly
  // like the static CSS defaults.
  const primaryScale = generateScale(siteTheme.primaryColor, 600);
  const goldScale = generateScale(siteTheme.goldColor, 500);
  const creamScale = generateScale(siteTheme.backgroundColor, 50);
  const footerTints = deriveTints(siteTheme.footerColor);
  const themeVars = {
    ...Object.fromEntries(Object.entries(primaryScale).map(([step, hex]) => [`--color-emerald-${step}`, hex])),
    ...Object.fromEntries(Object.entries(goldScale).map(([step, hex]) => [`--color-gold-${step}`, hex])),
    ...Object.fromEntries(Object.entries(creamScale).map(([step, hex]) => [`--color-cream-${step}`, hex])),
    "--color-footer-bg": footerTints.base,
    "--color-footer-surface": footerTints.surface,
    "--color-footer-border": footerTints.border,
    "--color-hero-bg": siteTheme.heroColor,
    "--color-heading": siteTheme.headingColor,
    "--font-heading": headingFontStack(siteTheme.headingFont),
    "--font-body": bodyFontStack(siteTheme.bodyFont),
    "--font-script": scriptFontStack(siteTheme.scriptFont),
    ...cornerRadii(siteTheme.cornerStyle),
  } as React.CSSProperties;

  return (
    <html lang={locale} className={FONT_VARIABLES} style={themeVars}>
      <body className="antialiased">
        <OrganizationSchema profile={companyProfile} />
        <NextIntlClientProvider messages={messages}>
          <GoogleAnalytics />
          <ClientShell companyProfile={companyProfile}>{children}</ClientShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
