"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

// "Your data": downloads everything the site keeps about the person as one file.
export default function MyDataCard() {
  const t = useTranslations("accountPassword.myData");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/my-data");
      if (res.status === 429) throw new Error("rate");
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error && err.message === "rate" ? t("tooMany") : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="my-data" className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-4">
        <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={download}>{busy ? t("working") : t("button")}</Button>
      </div>
    </div>
  );
}
