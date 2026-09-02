import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your free account to connect with exhibitors, buyers, and trade professionals worldwide.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
