"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/client/registration-format";
import Button from "@/components/ui/Button";

interface Bounce { id: number; email: string; kind: "hard" | "soft"; reason: string; statusCode: string; count: number; firstAt: string; lastAt: string }

// Addresses the mail could not be delivered to. A hard one is not e-mailed again until it is cleared here.
export default function BouncedAddresses() {
  const t = useTranslations("adminBounces");
  const locale = useLocale();
  const [bounces, setBounces] = useState<Bounce[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/email-bounces", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { bounces: [] }))
      .then((d) => setBounces(d.bounces ?? []))
      .catch(() => setBounces([]));
  }, []);
  useEffect(load, [load]);

  async function clear(b: Bounce) {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch(`/api/admin/email-bounces?id=${b.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setBounces(d.bounces ?? []);
        setNote(t("cleared", { email: b.email }));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="bounced-addresses">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-700">{t("intro")}</p>
      {note && <p role="status" className="mt-2 text-sm font-semibold text-emerald-800">{note}</p>}
      {bounces && bounces.length === 0 && <p className="mt-3 text-sm text-gray-700">{t("none")}</p>}
      {bounces && bounces.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100 text-sm">
          {bounces.map((b) => (
            <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3" data-testid="bounce-row">
              <div className="min-w-0">
                <p className="font-semibold text-heading [overflow-wrap:anywhere]">{b.email} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${b.kind === "hard" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>{t(`kind.${b.kind}`)}</span></p>
                <p className="text-xs text-gray-700 [overflow-wrap:anywhere]">{b.reason || b.statusCode}</p>
                <p className="text-xs text-gray-600">{t("times", { count: b.count, date: formatDateTime(b.lastAt, locale) })}</p>
                {b.kind === "hard" && <p className="text-xs text-gray-600">{t("stopped")}</p>}
              </div>
              <Button type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={() => clear(b)}>{t("clear")}<span className="sr-only"> — {b.email}</span></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
