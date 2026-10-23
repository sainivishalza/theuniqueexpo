"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/client/registration-format";
import Button from "@/components/ui/Button";

interface Overview { available: boolean; enabled: boolean; lastBatchAt: string | null; lastCount: number }

// The weekly "new exhibitions" e-mail to buyers: off until switched on here. A preview goes only to the admin's own address.
export default function WeeklyDigest({ mailOn }: { mailOn: boolean }) {
  const t = useTranslations("adminDigest");
  const locale = useLocale();
  const { user } = useAuth();
  const checkId = useId();
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/email/digest", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(t("errors.load")));
  }, [t]);
  useEffect(load, [load]);

  async function call(method: "PUT" | "POST", body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/email/digest", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setData(d);
        setMessage(ok);
      } else setError(t.has(`errors.${d.code}`) ? t(`errors.${d.code}`) : t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="weekly-digest">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-700">{t("help")}</p>
      {data && (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <input id={checkId} type="checkbox" checked={data.enabled} disabled={busy || !data.available} onChange={(e) => call("PUT", { enabled: e.target.checked }, t("saved"))} className="mt-1 h-4 w-4" />
            <label htmlFor={checkId} className="text-sm text-heading">{t("enable")}</label>
          </div>
          <p className="text-xs text-gray-700">{data.lastBatchAt ? t("lastBatch", { date: formatDateTime(data.lastBatchAt.replace(" ", "T") + "Z", locale), count: data.lastCount }) : t("neverSent")}</p>
          {!mailOn && <p className="text-xs font-medium text-amber-900">{t("mailOff")}</p>}
          <Button type="button" variant="secondaryOutline" size="compact" disabled={busy || !mailOn} onClick={() => call("POST", { action: "preview", locale }, t("previewSent", { email: user?.email ?? "" }))}>{t("preview")}</Button>
        </div>
      )}
      <p role="status" className="mt-3 min-h-5 text-sm font-medium text-emerald-800">{message}</p>
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
