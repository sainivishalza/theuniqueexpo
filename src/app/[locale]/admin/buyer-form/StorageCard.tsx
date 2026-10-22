"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { errorMessage, formatNumber } from "@/lib/format";
import Button from "@/components/ui/Button";

interface Stats {
  files: number;
  totalBytes: number;
  largeFiles: number;
  largeBytes: number;
}

interface Cursor {
  source: number;
  afterUserId: number;
}

const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1);

// How much space the buyers' documents take, and a button that shrinks the big old pictures.
export default function StorageCard() {
  const t = useTranslations("adminBuyerForm.storage");
  const ta = useTranslations("adminCommon");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, shrunk: 0, saved: 0, failed: 0 });
  const [finished, setFinished] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/buyer-form/storage");
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch {
      setError(ta("somethingWentWrong"));
    }
  }, [ta]);

  useEffect(() => {
    load();
  }, [load]);

  async function run() {
    setRunning(true);
    setError("");
    setFinished(false);
    setProgress({ checked: 0, shrunk: 0, saved: 0, failed: 0 });
    let cursor: Cursor | undefined;
    try {
      for (let guard = 0; guard < 5000; guard++) {
        const res = await fetch("/api/admin/buyer-form/storage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cursor }),
        });
        if (!res.ok) throw new Error();
        const r = await res.json();
        setProgress((p) => ({ checked: p.checked + r.checked, shrunk: p.shrunk + r.shrunk, saved: p.saved + r.savedBytes, failed: p.failed + r.failed }));
        cursor = r.cursor;
        if (r.done) break;
      }
      setFinished(true);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setRunning(false);
      load();
    }
  }

  if (!stats) return error ? <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div> : null;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
      <p className="mt-3 text-sm text-gray-800">{t("summary", { files: formatNumber(stats.files), size: mb(stats.totalBytes) })}</p>
      <p className="mt-1 text-sm text-gray-800">
        {stats.largeFiles > 0 ? t("large", { files: formatNumber(stats.largeFiles), size: mb(stats.largeBytes) }) : t("noneLarge")}
      </p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {running && <p role="status" className="mt-3 text-sm text-gray-700">{t("working", { checked: formatNumber(progress.checked) })}</p>}
      {finished && !running && (
        <p role="status" className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
          {t("done", { shrunk: formatNumber(progress.shrunk), saved: mb(progress.saved) })}
          {progress.failed > 0 ? ` ${t("failed", { failed: progress.failed })}` : ""}
        </p>
      )}
      <div className="mt-4">
        <Button onClick={run} disabled={running || stats.largeFiles === 0} variant="save" size="compact">
          {running ? t("running") : t("button")}
        </Button>
      </div>
    </div>
  );
}
