import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exhibitions",
  description:
    "Browse upcoming B2B trade exhibitions and sourcing fairs worldwide. Find dates, venues, and industries, then register to attend or exhibit.",
};

export default function ExhibitionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
