export interface AboutStat {
  label: string;
  value: string;
}

export interface AboutContent {
  heading: string;
  tagline: string;
  story: string;
  mission: string;
  vision: string;
  stats: AboutStat[];
  heroImage: string;
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

export function normalizeAboutContent(input: unknown): AboutContent {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
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
