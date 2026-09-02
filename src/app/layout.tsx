import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/ClientShell";
import GoogleAnalytics from "@/components/GoogleAnalytics";

// Self-hosted at build time instead of fetched from Google's CDN at
// request time -- removes an external DNS/TLS/download round-trip from
// every first page load, which matters most on slow connections.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

const SITE_URL = "https://theuniqueexpo.com";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <GoogleAnalytics />
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
