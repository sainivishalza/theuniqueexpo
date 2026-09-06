import type { ComponentPropsWithoutRef } from "react";
import { Link } from "@/i18n/navigation";

export type CardShadow = "sm" | "md" | "lg";

const SHADOW_CLASSES: Record<CardShadow, string> = {
  sm: "shadow-sm",
  md: "shadow-md shadow-gray-200/50",
  lg: "shadow-lg shadow-gray-200/60",
};

const BASE_CLASSES = "block rounded-2xl overflow-hidden bg-white card-hover";

interface CardOwnProps {
  href?: string;
  shadow?: CardShadow;
  bordered?: boolean;
  className?: string;
}

type CardProps = CardOwnProps &
  (
    | ({ href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href">)
    | ({ href?: undefined } & ComponentPropsWithoutRef<"div">)
  );

// Shared card shell (exhibition/service/tour listing cards, process-step
// tiles, etc.) so the rounded-corner + shadow + hover-lift treatment stays
// consistent everywhere instead of being retyped per page. Renders a
// <Link> (with the hover "group" class for image zoom effects) when `href`
// is given, a plain <div> otherwise.
export default function Card({ href, shadow = "md", bordered = true, className = "", ...props }: CardProps) {
  const classes = `${BASE_CLASSES} ${SHADOW_CLASSES[shadow]} ${bordered ? "border border-gray-100" : ""} ${
    href ? "group" : ""
  } ${className}`;
  if (href) {
    return <Link href={href} className={classes} {...(props as Omit<ComponentPropsWithoutRef<typeof Link>, "href">)} />;
  }
  return <div className={classes} {...(props as ComponentPropsWithoutRef<"div">)} />;
}
