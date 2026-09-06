import type { ComponentPropsWithoutRef } from "react";

export type BadgeTone = "emerald" | "purple" | "gold" | "gray" | "white" | "live";
export type BadgeSize = "eyebrow" | "tag";

const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  purple: "bg-purple-100 text-purple-700",
  gold: "bg-gold-100 text-gold-800",
  gray: "bg-gray-100 text-gray-600",
  // Frosted tag over an image, e.g. an industry label on a poster card.
  white: "bg-white/90 backdrop-blur-sm text-gray-900 shadow-sm",
  // "Upcoming" / status marker over an image.
  live: "bg-green-500/90 backdrop-blur-sm text-white shadow-sm",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  // Section eyebrow above a heading, e.g. "Featured Experiences".
  eyebrow: "rounded-full px-4 py-1.5 text-sm font-semibold",
  // Small label on a card/image, e.g. industry or "Upcoming".
  tag: "rounded-lg px-3 py-1 text-xs font-bold",
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
