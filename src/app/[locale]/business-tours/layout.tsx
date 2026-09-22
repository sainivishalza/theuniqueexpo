import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Tours in China",
  description: "Your business trip to China, organized from arrival to departure — exhibition visits, hotels, transfers, interpreters, supplier meetings, and factory visits.",
};

export default function BusinessToursLayout({ children }: { children: React.ReactNode }) {
  return children;
}
