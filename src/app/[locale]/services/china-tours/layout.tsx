import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "China Sourcing Tours",
  description:
    "Guided sourcing tours to China's major trade fairs, with factory visits, interpreters, and hotel and transport included.",
};

export default function ChinaToursLayout({ children }: { children: React.ReactNode }) {
  return children;
}
