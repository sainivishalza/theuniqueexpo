"use client";

import { useEffect, useState } from "react";
import type { SiteStats } from "@/lib/site-stats-format";

let known: SiteStats | null = null;

/** The site's real figures (null until they arrive, and when they cannot be loaded). */
export function useSiteStats(): SiteStats | null {
  const [stats, setStats] = useState<SiteStats | null>(known);
  useEffect(() => {
    if (known) return;
    let alive = true;
    fetch("/api/site-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SiteStats | null) => {
        if (!alive || !d) return;
        known = d;
        setStats(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return stats;
}
