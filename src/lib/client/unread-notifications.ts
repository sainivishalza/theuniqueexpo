"use client";

import { useCallback, useEffect, useState } from "react";

const POLL_MS = 90_000;

// How many website notifications the signed-in person has not read yet: asked when the page opens, again every
// 90 seconds while the tab is visible and whenever it comes back into view. `refresh` asks right now.
export function useUnreadNotifications(enabled: boolean): { unread: number; refresh: () => void } {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!enabled) return;
    fetch("/api/notifications?count=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && typeof d.unread === "number" && setUnread(d.unread))
      .catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const timer = window.setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    // The notifications page tells the menu when something was read.
    window.addEventListener("notifications-changed", refresh);
    return () => {
      window.removeEventListener("notifications-changed", refresh);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refresh]);

  return { unread, refresh };
}
