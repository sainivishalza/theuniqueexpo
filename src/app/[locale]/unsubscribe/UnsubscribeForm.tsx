"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/Button";

// Asks first (so a mail scanner that opens the link does not unsubscribe anyone), then turns that kind of e-mail off.
export default function UnsubscribeForm({ u, k, token }: { u: string; k: string; token: string }) {
  const t = useTranslations("unsubscribePage");
  const [state, setState] = useState<"ask" | "busy" | "done" | "invalid" | "failed">(u && k && token ? "ask" : "invalid");
  const kind = k === "digest" ? "digest" : k === "savedAlerts" ? "savedAlerts" : null;

  async function confirm() {
    setState("busy");
    try {
      const res = await fetch("/api/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ u, k, t: token }) });
      setState(res.ok ? "done" : res.status === 400 ? "invalid" : "failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-extrabold text-heading">{t("title")}</h1>
      {state === "invalid" || !kind ? (
        <p role="alert" className="mt-4 text-gray-800">{t("invalid")}</p>
      ) : state === "done" ? (
        <div role="status" className="mt-4 space-y-3 text-gray-800">
          <p className="font-semibold text-emerald-800">{t(`${kind}.done`)}</p>
          <p>{t("again")}</p>
          <Link href="/dashboard/account" className="inline-block font-semibold text-emerald-800 underline">{t("settings")}</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-gray-800">{t(`${kind}.ask`)}</p>
          <Button type="button" variant="gradientCta" disabled={state === "busy"} onClick={confirm}>{state === "busy" ? t("working") : t(`${kind}.button`)}</Button>
          {state === "failed" && <p role="alert" className="text-sm font-medium text-red-700">{t("failed")}</p>}
          <p><Link href="/dashboard/account" className="py-1 text-sm font-semibold text-emerald-800 underline">{t("keep")}</Link></p>
        </div>
      )}
    </div>
  );
}
