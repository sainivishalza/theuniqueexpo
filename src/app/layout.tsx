import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

// Self-hosted at build time instead of fetched from Google's CDN at
// request time -- removes an external DNS/TLS/download round-trip from
// every first page load, which matters most on slow connections.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "The Unique Expo — Discover Something Unique Together",
  description:
    "Discover Something Unique Together — The world's leading B2B exhibition, trade-fair & sourcing platform connecting buyers with exhibitors worldwide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
