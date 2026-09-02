import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Tours",
  description:
    "All-inclusive business tours to major trade exhibitions — hotel, transport, B2B matchmaking, and factory visits bundled into one trip.",
};

export default function BusinessToursLayout({ children }: { children: React.ReactNode }) {
  return children;
}
