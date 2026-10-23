"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

// Confirms and runs "cancel these registrations" (see /api/expo-registrations/cancel-many).
export default function CancelManyDialog({
  items,
  onClose,
  onDone,
}: {
  items: { id: string; title: string }[];
  /** `done` is true when the registrations were cancelled (the ticks can go), false when the person backed out. */
  onClose: (done: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslations("buyerDashboard.registrations.cancelMany");
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ cancelled: number; notCancelled: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose(result !== null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose, result]);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/expo-registrations/cancel-many", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: items.map((i) => Number(i.id)) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) return setError(t("rateLimited"));
      if (!res.ok) return setError(t("error"));
      setResult({ cancelled: data.cancelled?.length ?? 0, notCancelled: data.notCancelled?.length ?? 0 });
      onDone();
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose(result !== null)}>
      <div className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId} className="text-xl font-bold text-heading">{t("title", { count: items.length })}</h2>
        {result ? (
          <div className="mt-4 space-y-2">
            <p role="status" className="font-semibold text-emerald-800">{t("done", { count: result.cancelled })}</p>
            {result.notCancelled > 0 && <p className="text-sm text-gray-700">{t("notCancelled", { count: result.notCancelled })}</p>}
            <div className="pt-2"><Button type="button" variant="save" size="compact" onClick={() => onClose(true)}>{t("close")}</Button></div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">{t("body")}</p>
            <ul className="max-h-40 list-disc space-y-1 overflow-auto pl-5 text-sm font-semibold text-heading [overflow-wrap:anywhere]">
              {items.map((i) => <li key={i.id}>{i.title}</li>)}
            </ul>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="ghostDanger" size="compact" disabled={busy} onClick={run}>{busy ? t("working") : t("confirm", { count: items.length })}</Button>
              <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={() => onClose(false)}>{t("keep")}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
