import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "B2B Marketplace",
  description:
    "Post buy requests and get quotes from verified suppliers, or browse open buy requests to submit a quotation as an exhibitor.",
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
