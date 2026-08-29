import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExpoBridge",
  description: "Global B2B Exhibition, Trade & Sourcing Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
