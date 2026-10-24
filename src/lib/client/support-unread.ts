"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";

// How many answers from our team the signed-in buyer has not opened yet, for the menu. Asked again whenever the page changes
// and once a minute; a failure just shows nothing.
export function useSupportUnread(enabled: boolean): number {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setUnread(0);
      return;
    }
    let live = true;
    const load = () =>
      fetch("/api/support/unread", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => live && d && typeof d.unread === "number" && setUnread(d.unread))
        .catch(() => {});
    load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [enabled, pathname]);
  return unread;
}
