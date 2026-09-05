import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import "./globals.css";
import ClientShell from "@/components/ClientShell";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import OrganizationSchema from "@/components/OrganizationSchema";
import { routing } from "@/i18n/routing";
import { getCompanyProfile } from "@/lib/server/company-profile-repo";

// Self-hosted at build time instead of fetched from Google's CDN at
// request time -- removes an external DNS/TLS/download round-trip from
// every first page load, which matters most on slow connections.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

const SITE_URL = "https://www.theuniqueexpo.com";
const SITE_NAME = "The Unique Expo";
const DEFAULT_DESCRIPTION =
  "Discover Something Unique Together — The world's leading B2B exhibition, trade-fair & sourcing platform connecting buyers with exhibitors worldwide.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Discover Something Unique Together`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
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

  const [messages, companyProfile] = await Promise.all([getMessages(), getCompanyProfile()]);

  return (
    <html lang={locale} className={inter.variable}>
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
