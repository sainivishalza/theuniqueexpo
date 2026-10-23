"use client";

import { useEffect } from "react";

// Tells the site when a script error happens in a visitor's browser, so a broken page is noticed without anyone having to
// report it. Sends at most 3 reports per page view, nothing personal (the address of the page without its query, the message and
// the stack), and nothing at all when the browser cannot send in the background.
export default function ClientErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const report = (message: string, stack: string) => {
      if (sent >= 3 || !message) return;
      sent += 1;
      try {
        const body = JSON.stringify({ message: message.slice(0, 400), stack: stack.slice(0, 3000), page: window.location.pathname });
        navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }));
      } catch {
        /* nothing more to do */
      }
    };
    const onError = (e: ErrorEvent) => report(e.message || "", e.error?.stack ?? "");
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason as { message?: string; stack?: string } | string | undefined;
      report(typeof reason === "string" ? reason : String(reason?.message ?? ""), typeof reason === "object" ? String(reason?.stack ?? "") : "");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
