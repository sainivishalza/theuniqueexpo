import type { ComponentPropsWithoutRef } from "react";
import { Link } from "@/i18n/navigation";

export type ButtonVariant = "primary" | "dark" | "outline" | "gradient" | "gold" | "gradientCta" | "save" | "linkDanger" | "dashedAdd";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // White pill on a dark/colored background -- main hero/CTA buttons.
  primary:
    "bg-white text-emerald-700 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-105",
  // Solid dark pill -- secondary CTA on light backgrounds.
  dark: "bg-gray-900 text-white hover:bg-gray-800",
  // Transparent outline on dark/colored backgrounds.
  outline: "border-2 border-white/30 text-white backdrop-blur-sm hover:bg-white/10",
  // Brand gradient fill.
  gradient: "gradient-brand text-white hover:scale-105",
  // Gold accent fill -- for highlight actions, used sparingly.
  gold: "bg-gold-500 text-white shadow-lg shadow-gold-500/25 hover:bg-gold-600 hover:scale-105",
  // Full-width gradient CTA on a detail-page sidebar panel (register/book buttons).
  gradientCta: "gradient-brand text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:scale-[1.02]",
  // Admin form save/submit button.
  save: "gradient-brand text-white hover:opacity-90 disabled:opacity-50",
  // Plain text "remove/delete" action in an admin list row.
  linkDanger: "text-red-600 hover:underline",
  // "Add another item" action in an admin repeatable-item list.
  dashedAdd: "border-2 border-dashed border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600",
};

export type ButtonSize = "md" | "sm" | "block" | "blockSm" | "blockLg" | "inline";

// Padding/text-size live on a size variant rather than being left to an
// overriding className -- two same-specificity Tailwind utility classes
// (e.g. base "py-4" + override "py-3.5") don't reliably cascade by string
// order, only by generated-CSS order, so mixing them risks the wrong one
// winning.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-8 py-4 text-base",
  sm: "px-8 py-3.5 text-sm",
  // Full-width sidebar CTA -- no horizontal padding, text centered by the width itself.
  block: "w-full py-3 text-sm",
  // Full-width admin "add item" action.
  blockSm: "w-full py-2.5 text-sm",
  // Full-width admin save button.
  blockLg: "w-full py-4 text-sm",
  // Plain inline text action, no padding/width -- e.g. a row's delete link.
  inline: "text-xs",
};

const BASE_CLASSES = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-300";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  className?: string;
}

type ButtonProps = ButtonOwnProps &
  (
    | ({ href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href">)
    | ({ href?: undefined } & ComponentPropsWithoutRef<"button">)
  );

// Shared button/CTA primitive so hero, card, and section CTAs all pull from
// the same variant set instead of each page hand-rolling its own classes.
// Renders a <Link> when `href` is given, a <button> otherwise.
export default function Button({ variant = "primary", size = "md", href, className = "", ...props }: ButtonProps) {
  const classes = `${BASE_CLASSES} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`;
  if (href) {
    return <Link href={href} className={classes} {...(props as Omit<ComponentPropsWithoutRef<typeof Link>, "href">)} />;
  }
  return <button className={classes} {...(props as ComponentPropsWithoutRef<"button">)} />;
}
