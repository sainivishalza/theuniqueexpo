import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Business tours, China sourcing trips, consultation, visa setup, moving assistance, and transport subsidies for exhibitors and buyers.",
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
