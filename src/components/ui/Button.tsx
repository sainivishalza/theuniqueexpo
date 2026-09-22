import type { ComponentPropsWithoutRef } from "react";
import { Link } from "@/i18n/navigation";

export type ButtonVariant =
  | "primary"
  | "dark"
  | "outline"
  | "secondaryOutline"
  | "tertiary"
  | "gradient"
  | "gold"
  | "gradientCta"
  | "gradientPlain"
  | "save"
  | "linkDanger"
  | "dashedAdd"
  | "gradientFlat"
  | "ghost"
  | "ghostDanger";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Amber-on-navy pill -- the site's one primary CTA color, used sparingly
  // (hero + final CTA only). translate-y-0.5 is exactly 2px in Tailwind's
  // default spacing scale, matching the brief's "-2px on hover" literally.
  // Focus ring is navy outline + white ring rather than an amber outline:
  // amber-on-amber (the button's own fill) has poor contrast, and since
  // this variant appears on both light (nav CTA, form submit) and dark
  // (hero) surfaces, no single ring color stays visible on both -- the
  // navy outline reads on light backgrounds, the white ring reads against
  // the amber fill itself on dark ones.
  primary:
    "bg-gold-500 text-emerald-950 hover:bg-gold-600 hover:-translate-y-0.5 active:translate-y-0 active:bg-gold-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:hover:bg-gold-500",
  // Solid dark pill -- secondary CTA on light backgrounds.
  dark: "bg-gray-900 text-white hover:bg-gray-800",
  // Thin outline on dark/colored backgrounds (hero, final CTA) -- fills
  // solid on hover/focus, text flips to the true navy (not near-black
  // emerald-950) for a smoother transition against the white fill.
  outline:
    "border border-white text-white hover:bg-white hover:text-emerald-600 active:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-transparent disabled:hover:text-white",
  // Same outline shape as `outline`, but tuned for a *light* background --
  // navy border/text instead of white, since white-on-white would vanish.
  // The public-facing "secondary" tier; `ghost` stays reserved for
  // low-emphasis admin chrome (cancel/view/edit rows) and keeps its own
  // muted gray treatment untouched.
  secondaryOutline:
    "border border-emerald-900 text-emerald-900 hover:bg-emerald-900 hover:text-white active:bg-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-transparent disabled:hover:text-emerald-900",
  // Plain text link, underlined only on hover/focus -- lowest-emphasis
  // action (the brief's "ghost" tier).
  tertiary: "text-emerald-700 underline-offset-4 hover:underline hover:text-emerald-800 active:text-emerald-900 focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 focus-visible:outline-offset-4 disabled:opacity-40 disabled:pointer-events-none disabled:hover:no-underline",
  // Brand gradient fill.
  gradient: "gradient-brand text-white hover:scale-105",
  // Gold accent fill -- for highlight actions, used sparingly.
  gold: "bg-gold-500 text-emerald-950 hover:bg-gold-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2",
  // Full-width gradient CTA on a detail-page sidebar panel (register/book buttons).
  gradientCta: "gradient-brand text-white shadow-[var(--shadow-card-sm)] hover:shadow-[var(--shadow-card-md)] disabled:opacity-50",
  // Flat gradient fill with no hover/disabled treatment at all -- a "try again"/
  // "log in" link after a success or gated state.
  gradientPlain: "gradient-brand text-white",
  // Admin form save/submit button.
  save: "gradient-brand text-white hover:opacity-90 disabled:opacity-50",
  // Plain text "remove/delete" action in an admin list row.
  linkDanger: "text-red-600 hover:underline",
  // "Add another item" action in an admin repeatable-item list.
  dashedAdd: "border-2 border-dashed border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600",
  // Admin CRUD form's inline save/create button (flatter than gradientCta -- no hover lift).
  gradientFlat: "gradient-brand text-white shadow-md disabled:opacity-50",
  // Secondary/neutral action on a light background -- admin form cancel, row view/edit links.
  ghost: "border border-gray-200 text-gray-700 hover:bg-cream-50",
  // Destructive secondary action on a light background -- admin row delete.
  ghostDanger: "border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50",
};

export type ButtonSize = "md" | "sm" | "block" | "blockSm" | "blockMd" | "blockLg" | "inline" | "compact" | "wide" | "xs";

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
  // Full-width auth form submit button.
  blockMd: "w-full py-3.5 text-sm",
  // Full-width admin save button.
  blockLg: "w-full py-4 text-sm",
  // Plain inline text action, no padding/width -- e.g. a row's delete link.
  inline: "text-xs",
  // Admin form/header action button (new item, save, cancel).
  compact: "px-5 py-2.5 text-sm",
  // Inline (non-full-width) gradient CTA, e.g. a dashboard panel's action button.
  wide: "px-6 py-3 text-sm",
  // Admin list-row action button (view, edit, delete).
  xs: "px-4 py-2 text-xs",
};

const BASE_CLASSES = "inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-semibold transition-all duration-300 whitespace-nowrap shrink-0";

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
