// Admin-controlled colors and fonts for the whole site. Colors are stored
// as single hex values per role and expanded into full Tailwind-style
// scales at render time (see theme-colors.ts) rather than storing every
// shade -- one picker per role stays simple for the admin while still
// recoloring every emerald-*/gold-*/cream-* utility already used sitewide.
// Fonts are stored as keys into a fixed, self-hosted catalog (see
// FONT_CATALOG below) rather than free text, since next/font requires
// fonts to be statically known at build time -- an admin can only choose
// among fonts this app has actually bundled.

export type HeadingFontKey = "oswald" | "bebasNeue" | "anton" | "robotoCondensed" | "archivoNarrow";
export type BodyFontKey = "inter" | "manrope" | "montserrat" | "openSans";
export type ScriptFontKey = "caveat" | "dancingScript" | "pacifico";
export type CornerStyleKey = "sharp" | "soft" | "rounded";
export type CardShadowStyleKey = "flat" | "soft" | "bold";

export interface SiteTheme {
  primaryColor: string; // buttons, links, badges -- the emerald-* scale
  goldColor: string; // premium/highlight accents -- the gold-* scale
  backgroundColor: string; // main warm page background -- the cream-* scale
  footerColor: string; // footer background, independent of primaryColor
  heroColor: string; // dark hero/section-header background, independent of footerColor
  headingColor: string; // h1-h6 text color, independent of primaryColor
  headingFont: HeadingFontKey;
  bodyFont: BodyFontKey;
  scriptFont: ScriptFontKey;
  cornerStyle: CornerStyleKey; // rounding of every button/card/badge/icon tile
  cardShadowStyle: CardShadowStyleKey; // elevation of every Card
}

// Matches what's already live -- picking these as defaults means a site
// with no saved row (or a row missing a field) renders identically to
// today, and the admin panel just shows the current look pre-filled.
// headingColor's default (#111827) is Tailwind's own gray-900, which is
// what every heading already renders in today via plain text-gray-900
// classNames -- so a missing/default value changes nothing.
export const DEFAULT_SITE_THEME: SiteTheme = {
  primaryColor: "#075b4f",
  goldColor: "#c9a24a",
  backgroundColor: "#fefdfb",
  footerColor: "#011714",
  heroColor: "#111827",
  headingColor: "#111827",
  headingFont: "oswald",
  bodyFont: "inter",
  scriptFont: "caveat",
  cornerStyle: "soft",
  cardShadowStyle: "soft",
};

export const CORNER_STYLE_OPTIONS: { key: CornerStyleKey; label: string }[] = [
  { key: "sharp", label: "Sharp" },
  { key: "soft", label: "Soft" },
  { key: "rounded", label: "Rounded" },
];

// One role per shared component's radius (see src/components/ui/*.tsx),
// each currently a fixed Tailwind rounded-* class -- "soft" reproduces
// those exact original values so the default corner style changes
// nothing. eyebrow/status badges stay a fixed pill (rounded-full) in the
// component itself regardless of corner style -- a "sharp" pill isn't a
// smaller pill, it's a different shape, so it's not part of this control.
const CORNER_RADIUS_PX: Record<CornerStyleKey, { button: number; card: number; badge: number; iconXs: number; iconSm: number; iconMd: number; iconLg: number }> = {
  sharp: { button: 6, card: 8, badge: 4, iconXs: 6, iconSm: 6, iconMd: 8, iconLg: 8 },
  soft: { button: 12, card: 16, badge: 8, iconXs: 8, iconSm: 12, iconMd: 16, iconLg: 16 },
  rounded: { button: 16, card: 24, badge: 12, iconXs: 12, iconSm: 16, iconMd: 20, iconLg: 24 },
};

export function cornerRadii(style: CornerStyleKey): Record<string, string> {
  const px = CORNER_RADIUS_PX[style] ?? CORNER_RADIUS_PX.soft;
  return {
    "--radius-button": `${px.button}px`,
    "--radius-card": `${px.card}px`,
    "--radius-badge": `${px.badge}px`,
    "--radius-icon-xs": `${px.iconXs}px`,
    "--radius-icon-sm": `${px.iconSm}px`,
    "--radius-icon-md": `${px.iconMd}px`,
    "--radius-icon-lg": `${px.iconLg}px`,
  };
}

export const CARD_SHADOW_OPTIONS: { key: CardShadowStyleKey; label: string }[] = [
  { key: "flat", label: "Flat" },
  { key: "soft", label: "Soft" },
  { key: "bold", label: "Bold" },
];

// "soft" reproduces Card.tsx's original fixed values exactly (Tailwind's
// own shadow-sm/md/lg, with md/lg tinted gray-200 at 50%/60% the way the
// component previously hardcoded), so the default changes nothing.
const CARD_SHADOW_VALUES: Record<CardShadowStyleKey, { sm: string; md: string; lg: string }> = {
  flat: {
    sm: "0 1px 1px 0 rgb(0 0 0 / 0.03)",
    md: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
    lg: "0 2px 6px 0 rgb(0 0 0 / 0.06)",
  },
  soft: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(229 231 235 / 0.5), 0 2px 4px -2px rgb(229 231 235 / 0.5)",
    lg: "0 10px 15px -3px rgb(229 231 235 / 0.6), 0 4px 6px -4px rgb(229 231 235 / 0.6)",
  },
  bold: {
    sm: "0 2px 4px 0 rgb(0 0 0 / 0.08)",
    md: "0 8px 12px -2px rgb(0 0 0 / 0.15), 0 4px 6px -3px rgb(0 0 0 / 0.12)",
    lg: "0 20px 28px -6px rgb(0 0 0 / 0.18), 0 8px 12px -6px rgb(0 0 0 / 0.14)",
  },
};

export function cardShadows(style: CardShadowStyleKey): Record<string, string> {
  const v = CARD_SHADOW_VALUES[style] ?? CARD_SHADOW_VALUES.soft;
  return {
    "--shadow-card-sm": v.sm,
    "--shadow-card-md": v.md,
    "--shadow-card-lg": v.lg,
  };
}

export const HEADING_FONT_OPTIONS: { key: HeadingFontKey; label: string; variable: string; fallback: string }[] = [
  { key: "oswald", label: "Oswald", variable: "--font-oswald", fallback: '"Oswald", sans-serif' },
  { key: "bebasNeue", label: "Bebas Neue", variable: "--font-bebas-neue", fallback: '"Bebas Neue", sans-serif' },
  { key: "anton", label: "Anton", variable: "--font-anton", fallback: '"Anton", sans-serif' },
  { key: "robotoCondensed", label: "Roboto Condensed", variable: "--font-roboto-condensed", fallback: '"Roboto Condensed", sans-serif' },
  { key: "archivoNarrow", label: "Archivo Narrow", variable: "--font-archivo-narrow", fallback: '"Archivo Narrow", sans-serif' },
];

export const BODY_FONT_OPTIONS: { key: BodyFontKey; label: string; variable: string; fallback: string }[] = [
  { key: "inter", label: "Inter", variable: "--font-inter", fallback: '"Inter", sans-serif' },
  { key: "manrope", label: "Manrope", variable: "--font-manrope", fallback: '"Manrope", sans-serif' },
  { key: "montserrat", label: "Montserrat", variable: "--font-montserrat", fallback: '"Montserrat", sans-serif' },
  { key: "openSans", label: "Open Sans", variable: "--font-open-sans", fallback: '"Open Sans", sans-serif' },
];

export const SCRIPT_FONT_OPTIONS: { key: ScriptFontKey; label: string; variable: string; fallback: string }[] = [
  { key: "caveat", label: "Caveat", variable: "--font-caveat", fallback: '"Caveat", cursive' },
  { key: "dancingScript", label: "Dancing Script", variable: "--font-dancing-script", fallback: '"Dancing Script", cursive' },
  { key: "pacifico", label: "Pacifico", variable: "--font-pacifico", fallback: '"Pacifico", cursive' },
];

function fontStack(variable: string, fallback: string): string {
  return `var(${variable}), ${fallback}`;
}

export function headingFontStack(key: HeadingFontKey): string {
  const option = HEADING_FONT_OPTIONS.find((o) => o.key === key) ?? HEADING_FONT_OPTIONS[0];
  return fontStack(option.variable, option.fallback);
}

export function bodyFontStack(key: BodyFontKey): string {
  const option = BODY_FONT_OPTIONS.find((o) => o.key === key) ?? BODY_FONT_OPTIONS[0];
  return fontStack(option.variable, option.fallback);
}

export function scriptFontStack(key: ScriptFontKey): string {
  const option = SCRIPT_FONT_OPTIONS.find((o) => o.key === key) ?? SCRIPT_FONT_OPTIONS[0];
  return fontStack(option.variable, option.fallback);
}

const HEADING_KEYS = new Set(HEADING_FONT_OPTIONS.map((o) => o.key));
const BODY_KEYS = new Set(BODY_FONT_OPTIONS.map((o) => o.key));
const SCRIPT_KEYS = new Set(SCRIPT_FONT_OPTIONS.map((o) => o.key));
const CORNER_KEYS = new Set(CORNER_STYLE_OPTIONS.map((o) => o.key));
const CARD_SHADOW_KEYS = new Set(CARD_SHADOW_OPTIONS.map((o) => o.key));
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeSiteTheme(input: unknown): SiteTheme {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const hex = (key: keyof SiteTheme) => {
    const value = record[key];
    return typeof value === "string" && HEX_RE.test(value) ? value : DEFAULT_SITE_THEME[key];
  };
  const heading = typeof record.headingFont === "string" && HEADING_KEYS.has(record.headingFont as HeadingFontKey)
    ? (record.headingFont as HeadingFontKey)
    : DEFAULT_SITE_THEME.headingFont;
  const body = typeof record.bodyFont === "string" && BODY_KEYS.has(record.bodyFont as BodyFontKey)
    ? (record.bodyFont as BodyFontKey)
    : DEFAULT_SITE_THEME.bodyFont;
  const script = typeof record.scriptFont === "string" && SCRIPT_KEYS.has(record.scriptFont as ScriptFontKey)
    ? (record.scriptFont as ScriptFontKey)
    : DEFAULT_SITE_THEME.scriptFont;
  const corner = typeof record.cornerStyle === "string" && CORNER_KEYS.has(record.cornerStyle as CornerStyleKey)
    ? (record.cornerStyle as CornerStyleKey)
    : DEFAULT_SITE_THEME.cornerStyle;
  const cardShadow = typeof record.cardShadowStyle === "string" && CARD_SHADOW_KEYS.has(record.cardShadowStyle as CardShadowStyleKey)
    ? (record.cardShadowStyle as CardShadowStyleKey)
    : DEFAULT_SITE_THEME.cardShadowStyle;

  return {
    primaryColor: hex("primaryColor") as string,
    goldColor: hex("goldColor") as string,
    backgroundColor: hex("backgroundColor") as string,
    footerColor: hex("footerColor") as string,
    heroColor: hex("heroColor") as string,
    headingColor: hex("headingColor") as string,
    headingFont: heading,
    bodyFont: body,
    scriptFont: script,
    cornerStyle: corner,
    cardShadowStyle: cardShadow,
  };
}
