import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "China Travel",
  description: "Combine your exhibition visit with real China travel -- Guangzhou, Shenzhen, Yangshuo, Hong Kong and more, or build your own route.",
};

export default function ChinaTravelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
