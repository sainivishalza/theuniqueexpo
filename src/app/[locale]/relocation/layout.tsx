import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relocation",
  description: "Housing, schools, visas, and settling-in support for moving to China.",
};

export default function RelocationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
