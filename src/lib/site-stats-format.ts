// The figures shown on the home, sign-in and sign-up pages, and how they are written. Pure (no database), so pages in the browser can use it.

export interface SiteStats {
  exhibitions: number;
  upcomingExhibitions: number;
  /** Exhibitors at the upcoming exhibitions: the organisers' own figures, added up. */
  exhibitors: number;
  tours: number;
  buyers: number;
  buyerCountries: number;
}

/** Below these a figure is left out rather than shown small. */
export const MINIMUMS = { exhibitions: 3, exhibitors: 100, tours: 2, buyers: 50, buyerCountries: 5 } as const;

export function showable(stats: SiteStats, key: keyof typeof MINIMUMS): boolean {
  return stats[key] >= MINIMUMS[key];
}

/** "2,300+" for a large figure, the exact number for a small one (rounded DOWN, so it is never more than the truth). */
export function friendlyCount(value: number, locale: string): string {
  const fmt = (x: number) => new Intl.NumberFormat(locale).format(x);
  if (value >= 1000) return `${fmt(Math.floor(value / 100) * 100)}+`;
  if (value >= 100) return `${fmt(Math.floor(value / 50) * 50)}+`;
  return fmt(value);
}
