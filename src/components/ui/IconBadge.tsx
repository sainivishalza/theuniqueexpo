import type { ReactNode } from "react";

export type IconBadgeSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<IconBadgeSize, string> = {
  // Numbered highlight marker, e.g. a detail page's highlight list.
  xs: "w-8 h-8 rounded-[var(--radius-icon-xs)] text-sm",
  // Quick-stat icon tile, e.g. a detail page's stats bar.
  sm: "w-10 h-10 rounded-[var(--radius-icon-sm)] text-lg",
  md: "w-14 h-14 rounded-[var(--radius-icon-md)] text-xl",
  lg: "w-16 h-16 rounded-[var(--radius-icon-lg)] text-3xl",
};

interface IconBadgeProps {
  icon: ReactNode;
  size?: IconBadgeSize;
  /** Tailwind gradient stops, e.g. "from-emerald-500 to-emerald-600". Omit for a flat tint background. */
  gradient?: string;
  /** Flat background tint, used when no gradient is given, e.g. "bg-emerald-50". */
  tint?: string;
  /** Full background/text class override, e.g. "gradient-brand text-white",
   * for callers that need a named gradient utility rather than raw stops.
   * Takes precedence over `gradient`/`tint` when given. */
  bgClassName?: string;
  className?: string;
}

// Shared circular/rounded icon tile used for process steps, "why choose
// us" benefits, quick-stat icons, and numbered highlight markers. Pass a
// gradient (colorful step icons), a flat tint (softer benefit icons), or
// bgClassName for a full override (e.g. a named gradient utility class).
export default function IconBadge({ icon, size = "md", gradient, tint = "bg-emerald-50", bgClassName, className = "" }: IconBadgeProps) {
  const background = bgClassName ?? (gradient ? `bg-gradient-to-br ${gradient} text-white` : `${tint} text-current`);
  return (
    <div className={`inline-flex items-center justify-center ${SIZE_CLASSES[size]} ${background} ${className}`}>
      {icon}
    </div>
  );
}
