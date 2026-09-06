import type { ReactNode } from "react";

export type IconBadgeSize = "md" | "lg";

const SIZE_CLASSES: Record<IconBadgeSize, string> = {
  md: "w-14 h-14 rounded-2xl text-xl",
  lg: "w-16 h-16 rounded-2xl text-3xl",
};

interface IconBadgeProps {
  icon: ReactNode;
  size?: IconBadgeSize;
  /** Tailwind gradient stops, e.g. "from-emerald-500 to-emerald-600". Omit for a flat tint background. */
  gradient?: string;
  /** Flat background tint, used when no gradient is given, e.g. "bg-emerald-50". */
  tint?: string;
  className?: string;
}

// Shared circular icon tile used for process steps, "why choose us"
// benefits, and similar emoji/icon call-outs. Either pass a gradient
// (colorful step icons) or a flat tint (softer benefit icons).
export default function IconBadge({ icon, size = "md", gradient, tint = "bg-emerald-50", className = "" }: IconBadgeProps) {
  const background = gradient ? `bg-gradient-to-br ${gradient} text-white` : `${tint} text-current`;
  return (
    <div className={`inline-flex items-center justify-center ${SIZE_CLASSES[size]} ${background} ${className}`}>
      {icon}
    </div>
  );
}
