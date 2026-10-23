"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Overview { available: boolean; requireTwoStep: boolean; withoutTwoStep: number; ownTwoStep: boolean }

// "Every admin must use two-step sign-in": while on, an admin who has not set it up can only open their account page.
export default function TwoStepRule() {
  const t = useTranslations("adminSecurity");
  const id = useId();
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/security-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  async function change(value: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/security-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requireTwoStep: value }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setData(d);
        setMessage(value ? t("nowOn") : t("nowOff"));
      } else setError(t.has(`errors.${d.code}`) ? t(`errors.${d.code}`) : t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm space-y-2" data-testid="two-step-rule">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <div className="flex items-start gap-3">
        <input id={id} type="checkbox" checked={data.requireTwoStep} disabled={busy || !data.available} onChange={(e) => change(e.target.checked)} className="mt-1 h-4 w-4" />
        <label htmlFor={id} className="text-sm text-heading">{t("label")}</label>
      </div>
      <p className="text-xs text-gray-700">{t("explain")}</p>
      <p className="text-xs text-gray-700">{t("without", { count: data.withoutTwoStep })}</p>
      {!data.ownTwoStep && <p className="text-xs text-amber-900">{t("setUpYours")} <Link href="/admin/account" className="font-semibold underline">{t("openAccount")}</Link></p>}
      {message && <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
