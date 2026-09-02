import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consultation Services",
  description:
    "Market entry strategy, supplier sourcing, and trade consultation services for buyers and exhibitors expanding into new markets.",
};

export default function ConsultationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
