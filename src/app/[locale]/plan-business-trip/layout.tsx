import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan My Business Trip",
  description: "Tell us about your business trip to China -- exhibition, dates, and what you need -- and we'll send a tailored plan.",
};

export default function PlanBusinessTripLayout({ children }: { children: React.ReactNode }) {
  return children;
}
