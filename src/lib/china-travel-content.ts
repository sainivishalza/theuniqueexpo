export interface ChinaDestination {
  icon: string;
  name: string;
  tagline: string;
  highlights: string[];
  /** Photo shown on the destination card -- data URL or external URL.
   * Optional: existing rows seeded before this field existed have none, and
   * the public page falls back to a plain icon tile until an admin uploads
   * one via /admin/china-travel. */
  image?: string;
}

export interface ChinaRoute {
  title: string;
  duration: string;
  description: string;
}

export interface ChinaTravelContent {
  destinations: ChinaDestination[];
  routes: ChinaRoute[];
}

// Used when the table hasn't been seeded yet (shouldn't normally happen --
// the migration seeds a row -- but keeps the page/admin form from crashing).
export const DEFAULT_CHINA_TRAVEL_CONTENT: ChinaTravelContent = {
  destinations: [],
  routes: [],
};

function isChinaDestination(value: unknown): value is ChinaDestination {
  const record = value as Record<string, unknown> | null;
  return (
    !!record &&
    typeof record.icon === "string" &&
    typeof record.name === "string" &&
    typeof record.tagline === "string" &&
    Array.isArray(record.highlights)
  );
}

function isChinaRoute(value: unknown): value is ChinaRoute {
  const record = value as Record<string, unknown> | null;
  return !!record && typeof record.title === "string" && typeof record.duration === "string" && typeof record.description === "string";
}

export function normalizeChinaTravelContent(input: unknown): ChinaTravelContent {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    destinations: Array.isArray(record.destinations)
      ? record.destinations.filter(isChinaDestination).map((d) => ({
          icon: d.icon,
          name: d.name,
          tagline: d.tagline,
          highlights: d.highlights.filter((h): h is string => typeof h === "string"),
          image: typeof d.image === "string" ? d.image : "",
        }))
      : [],
    routes: Array.isArray(record.routes)
      ? record.routes.filter(isChinaRoute).map((r) => ({ title: r.title, duration: r.duration, description: r.description }))
      : [],
  };
}
