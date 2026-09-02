import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moving & Freight Assistance",
  description: "Sea, air, and land freight shipping with full tracking for exhibitors moving goods to and from trade exhibitions.",
};

export default function MovingAssistanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
