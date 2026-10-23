"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { isVital, pageGroup } from "@/lib/web-vitals";

// Tells the site how fast pages feel to real visitors (loading, responding to taps, jumping around), so a slow page is noticed
// without anyone complaining. One in five visits reports, only the measure's name and number, the kind of page ("exhibitions",
// not which one) and phone-or-computer; nothing about the person. Silent when the browser cannot send in the background.
const SHARE = 0.2;

export default function WebVitalsReporter() {
  const pathname = usePathname();
  const sampled = useRef<boolean | null>(null);
  useReportWebVitals((metric) => {
    if (sampled.current === null) sampled.current = Math.random() < SHARE;
    if (!sampled.current || !isVital(metric.name)) return;
    try {
      const body = JSON.stringify({ name: metric.name, value: metric.value, page: pageGroup(pathname || "/"), device: window.innerWidth < 768 ? "phone" : "desktop" });
      navigator.sendBeacon?.("/api/web-vitals", new Blob([body], { type: "application/json" }));
    } catch {
      /* nothing more to do */
    }
  });
  return null;
}
