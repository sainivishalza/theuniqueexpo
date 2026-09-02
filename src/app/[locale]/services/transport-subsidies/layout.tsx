import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transport Subsidies",
  description: "Check eligibility for transport subsidies covering travel to major B2B exhibitions and trade fairs.",
};

export default function TransportSubsidiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
