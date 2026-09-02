import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exhibitor Directory",
  description:
    "Search the exhibitor directory to find verified manufacturers and suppliers by industry, country, and product category.",
};

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
