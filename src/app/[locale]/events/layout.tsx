import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description: "Networking, hiking, picnics, and cultural meetups in Guangzhou and other cities.",
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
