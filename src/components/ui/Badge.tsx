import type { ComponentPropsWithoutRef } from "react";

export type BadgeTone = "emerald" | "purple" | "gold" | "gray" | "white" | "live" | "outline-light" | "warning" | "success" | "danger";
export type BadgeSize = "eyebrow" | "tag" | "pill" | "status";

const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  purple: "bg-purple-100 text-purple-700",
  gold: "bg-gold-100 text-gold-800",
  gray: "bg-gray-100 text-gray-600",
  // Frosted tag over an image, e.g. an industry label on a poster card.
  white: "bg-white/90 backdrop-blur-sm text-gray-900 shadow-sm",
  // "Upcoming" / status marker over an image.
  live: "bg-green-500/90 backdrop-blur-sm text-white shadow-sm",
  // Meta tag on a dark header bar, e.g. a detail page's industry/duration tag.
  "outline-light": "bg-white/10 text-white border border-white/10",
  // Admin status pill -- pending/awaiting action.
  warning: "bg-yellow-100 text-yellow-700",
  // Admin status pill -- confirmed/approved.
  success: "bg-green-100 text-green-700",
  // Admin status pill -- cancelled/rejected.
  danger: "bg-red-100 text-red-700",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  // Section eyebrow above a heading, e.g. "Featured Experiences".
  eyebrow: "rounded-full px-4 py-1.5 text-sm font-semibold",
  // Small label on a card/image, e.g. industry or "Upcoming".
  tag: "rounded-[var(--radius-badge)] px-3 py-1 text-xs font-bold",
  // Meta tag on a detail page's dark header bar.
  pill: "rounded-[var(--radius-badge)] px-3 py-1 text-sm font-medium",
  // Admin record status pill (booking/application/order status).
  status: "rounded-full px-2 py-0.5 text-xs font-medium",
};

interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: BadgeTone;
  size?: BadgeSize;
}

// Shared pill/tag primitive so section eyebrows and card labels across the
// site pull from the same tone + size set instead of each page re-typing
// its own bg/text color combination.
export default function Badge({ tone = "emerald", size = "eyebrow", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-block ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}
