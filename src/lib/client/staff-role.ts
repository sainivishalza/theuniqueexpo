"use client";

import { useEffect, useState } from "react";
import type { StaffPreset } from "@/lib/staff-access";
import { isStaffPreset } from "@/lib/staff-access";

// The back-office role of the signed-in admin ("full" until we know otherwise, so nobody with full access ever sees a
// flicker; someone with a limited role sees the menu shrink a moment after the page opens). The server enforces it
// either way: this only decides what to show.
let known: StaffPreset | null = null;

export function useStaffPreset(enabled: boolean): { preset: StaffPreset; loaded: boolean } {
  const [preset, setPreset] = useState<StaffPreset>(known ?? "full");
  const [loaded, setLoaded] = useState(known !== null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetch("/api/auth/staff-role", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const p = d && isStaffPreset(d.preset) ? d.preset : "full";
        known = p;
        setPreset(p);
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return { preset, loaded };
}
