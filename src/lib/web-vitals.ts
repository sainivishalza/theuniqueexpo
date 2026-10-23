// What counts as a good page for a real visitor (Google's Core Web Vitals thresholds), and how a page address becomes a
// "kind of page" so the numbers are grouped (all exhibition pages together, not one row per exhibition). No imports:
// used by the browser reporter, the API and the admin screen.

export const VITALS = ["LCP", "INP", "CLS", "TTFB", "FCP"] as const;
export type Vital = (typeof VITALS)[number];

// [good up to, poor above]
export const THRESHOLDS: Record<Vital, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
  FCP: [1800, 3000],
};

export function isVital(name: unknown): name is Vital {
  return typeof name === "string" && (VITALS as readonly string[]).includes(name);
}

export type Rating = "good" | "needs" | "poor";

export function rate(metric: Vital, value: number): Rating {
  const [good, poor] = THRESHOLDS[metric];
  return value <= good ? "good" : value > poor ? "poor" : "needs";
}

/** Largest believable value (milliseconds; CLS is a score): anything beyond is a broken measurement and is not counted. */
export function plausible(metric: Vital, value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= (metric === "CLS" ? 20 : 120_000);
}

/** "/ru/exhibitions/some-expo" -> "exhibitions/:item"; "/en" -> "home"; "/zh/login" -> "login". */
export function pageGroup(pathname: string): string {
  const parts = pathname.split("?")[0].split("/").filter(Boolean);
  if (parts[0] && /^(en|ru|zh)$/.test(parts[0])) parts.shift();
  if (parts.length === 0) return "home";
  const first = parts[0].toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 28) || "other";
  return parts.length > 1 ? `${first}/:item` : first;
}

export const PAGE_GROUP_RE = /^[a-z0-9-]{1,28}(\/:item)?$|^home$/;
/** Share of good page views needed to call a measure healthy (Google judges the 75th percentile). */
export const HEALTHY_SHARE = 0.75;
/** Fewest page views before a number is shown as a verdict. */
export const MIN_SAMPLES = 30;
