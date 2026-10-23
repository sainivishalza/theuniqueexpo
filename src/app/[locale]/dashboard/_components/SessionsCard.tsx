"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

// "Signed in somewhere else?": ends every other signed-in device, this one stays signed in.
export default function SessionsCard() {
  const t = useTranslations("accountPassword.sessions");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!confirm(t("confirm"))) return;
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const res = await fetch("/api/auth/sign-out-everywhere", { method: "POST" });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="sessions" className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {done && <p role="status" className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">{t("done")}</p>}
      <div className="mt-4">
        <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={run}>{busy ? t("working") : t("button")}</Button>
      </div>
    </div>
  );
}
