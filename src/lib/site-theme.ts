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

export interface SiteTheme {
  primaryColor: string; // buttons, links, badges -- the emerald-* scale
  goldColor: string; // premium/highlight accents -- the gold-* scale
  backgroundColor: string; // main warm page background -- the cream-* scale
  footerColor: string; // footer background, independent of primaryColor
  headingFont: HeadingFontKey;
  bodyFont: BodyFontKey;
  scriptFont: ScriptFontKey;
}

// Matches what's already live -- picking these as defaults means a site
// with no saved row (or a row missing a field) renders identically to
// today, and the admin panel just shows the current look pre-filled.
export const DEFAULT_SITE_THEME: SiteTheme = {
  primaryColor: "#075b4f",
  goldColor: "#c9a24a",
  backgroundColor: "#fefdfb",
  footerColor: "#011714",
  headingFont: "oswald",
  bodyFont: "inter",
  scriptFont: "caveat",
};

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

  return {
    primaryColor: hex("primaryColor") as string,
    goldColor: hex("goldColor") as string,
    backgroundColor: hex("backgroundColor") as string,
    footerColor: hex("footerColor") as string,
    headingFont: heading,
    bodyFont: body,
    scriptFont: script,
  };
}
