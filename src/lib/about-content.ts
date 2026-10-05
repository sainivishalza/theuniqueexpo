export interface AboutStat {
  label: string;
  value: string;
}

// The translated parts of the About page; the hero image is shared.
export interface AboutTranslation {
  heading: string;
  tagline: string;
  story: string;
  mission: string;
  vision: string;
  stats: AboutStat[];
}

export type AboutLocale = "ru" | "zh";
export const ABOUT_LOCALES: AboutLocale[] = ["ru", "zh"];

export interface AboutContent {
  heading: string;
  tagline: string;
  story: string;
  mission: string;
  vision: string;
  stats: AboutStat[];
  heroImage: string;
  // Admin-entered Russian/Chinese text; a missing language falls back to the
  // built-in default translation (while the English text is still the
  // unedited default) and then to English.
  translations?: Partial<Record<AboutLocale, AboutTranslation>>;
}

// Used when the table hasn't been seeded yet (shouldn't normally happen --
// the migration seeds a row -- but keeps the page/admin form from crashing).
export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  heading: "About The Unique Expo",
  tagline: "Connecting buyers and exhibitors across the globe, one exhibition at a time.",
  story:
    "The Unique Expo was founded to make it simple for buyers and exhibitors to find each other at the world's leading trade fairs. What started as a small team helping first-time exhibitors navigate unfamiliar markets has grown into a full-service B2B platform spanning exhibition registration, booth booking, hotel arrangements, visa support, and business tours.\n\nToday we work with organizers, buyers, and exhibitors across dozens of industries -- from furniture and electronics to pharmaceuticals and industrial machinery -- helping them turn a trade show visit into real business relationships.",
  mission:
    "To remove the friction from international trade fairs so buyers and exhibitors can focus on what matters -- building relationships and closing deals.",
  vision:
    "To become the trusted platform every serious trade fair buyer and exhibitor turns to first, in every major exhibition hub worldwide.",
  stats: [
    { label: "Exhibitions Supported", value: "200+" },
    { label: "Countries Served", value: "40+" },
    { label: "Registered Buyers", value: "10,000+" },
    { label: "Years of Experience", value: "8+" },
  ],
  heroImage: "",
};

function isAboutStat(value: unknown): value is AboutStat {
  const record = value as Record<string, unknown> | null;
  return !!record && typeof record.label === "string" && typeof record.value === "string";
}

function normalizeAboutTranslation(input: unknown): AboutTranslation | null {
  const r = (input && typeof input === "object" ? input : null) as Record<string, unknown> | null;
  if (!r) return null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const t: AboutTranslation = {
    heading: str(r.heading), tagline: str(r.tagline), story: str(r.story), mission: str(r.mission), vision: str(r.vision),
    stats: Array.isArray(r.stats) ? r.stats.filter(isAboutStat).map((s) => ({ label: s.label, value: s.value })) : [],
  };
  return t.heading || t.tagline || t.story || t.mission || t.vision || t.stats.length > 0 ? t : null;
}

export function normalizeAboutContent(input: unknown): AboutContent {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const raw = (record.translations && typeof record.translations === "object" ? record.translations : {}) as Record<string, unknown>;
  const translations: Partial<Record<AboutLocale, AboutTranslation>> = {};
  for (const loc of ABOUT_LOCALES) {
    const t = normalizeAboutTranslation(raw[loc]);
    if (t) translations[loc] = t;
  }
  return {
    ...(Object.keys(translations).length > 0 ? { translations } : {}),
    heading: typeof record.heading === "string" ? record.heading : DEFAULT_ABOUT_CONTENT.heading,
    tagline: typeof record.tagline === "string" ? record.tagline : DEFAULT_ABOUT_CONTENT.tagline,
    story: typeof record.story === "string" ? record.story : DEFAULT_ABOUT_CONTENT.story,
    mission: typeof record.mission === "string" ? record.mission : DEFAULT_ABOUT_CONTENT.mission,
    vision: typeof record.vision === "string" ? record.vision : DEFAULT_ABOUT_CONTENT.vision,
    stats: Array.isArray(record.stats)
      ? record.stats.filter(isAboutStat).map((s) => ({ label: s.label, value: s.value }))
      : DEFAULT_ABOUT_CONTENT.stats,
    heroImage: typeof record.heroImage === "string" ? record.heroImage : "",
  };
}

// The Russian/Chinese text to show, or null for English: the admin's own
// translation if entered, else the built-in default -- but only while the
// English text is still the unedited default (a translation of text that has
// since changed would be wrong).
export function resolveAboutTranslation(
  content: AboutContent,
  locale: string,
  defaults: Record<AboutLocale, AboutTranslation>
): AboutTranslation | null {
  if (locale !== "ru" && locale !== "zh") return null;
  const own = content.translations?.[locale];
  if (own && own.heading) return own;
  const d = DEFAULT_ABOUT_CONTENT;
  const unedited =
    content.heading === d.heading && content.tagline === d.tagline && content.story === d.story &&
    content.mission === d.mission && content.vision === d.vision && JSON.stringify(content.stats) === JSON.stringify(d.stats);
  return unedited ? defaults[locale] : null;
}
