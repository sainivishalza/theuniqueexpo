import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tours",
  description: "Guided travel tours across China and beyond — tell us who's going and what you love, and we'll tailor the itinerary.",
};

export default function ToursLayout({ children }: { children: React.ReactNode }) {
  return children;
}
