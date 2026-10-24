"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";

interface Status { configured: boolean; keyId: string | null; sources: { key: string; protected: number; unprotected: number }[]; protectedTotal: number; unprotectedTotal: number }
interface Outcome { protectedNow: number; failed: number; remaining: number; failedKeys: string[] }

// Admin -> Document protection: whether stored documents are encrypted, and encrypting the ones stored before a key was set.
export default function AdminDocumentProtectionPage() {
  const t = useTranslations("adminDocProtection");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; failed: number; finished: boolean } | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/document-protection", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStatus)
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  async function run() {
    setRunning(true);
    setFailed(false);
    let skip: string[] = [];
    let done = 0;
    setProgress({ done: 0, failed: 0, finished: false });
    try {
      for (let i = 0; i < 5000; i++) {
        const res = await fetch("/api/admin/document-protection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skip, start: i === 0 }) });
        if (!res.ok) throw new Error();
        const o: Outcome = await res.json();
        done += o.protectedNow;
        skip = [...skip, ...o.failedKeys];
        const finished = o.remaining === 0 || (o.protectedNow === 0 && o.failed === 0);
        setProgress({ done, failed: skip.length, finished });
        if (finished) break;
      }
      load();
    } catch {
      setFailed(true);
    } finally {
      setRunning(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-700">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/admin" className="text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-3xl px-6 space-y-5">
          <p className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-sm">{t("how")}</p>
          {failed && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{t("failed")}</p>}
          {status && (
            <>
              <div className={`rounded-2xl p-6 shadow-sm ${status.configured ? "bg-white" : "bg-amber-50"}`} data-testid="protection-key">
                <h2 className="text-lg font-bold text-heading">{status.configured ? t("keyOn") : t("keyOff")}</h2>
                {status.configured ? (
                  <p className="mt-1 text-sm text-gray-800">{t("keyId", { id: status.keyId ?? "" })}</p>
                ) : (
                  <p className="mt-1 text-sm text-amber-950">{t("keyHowTo")}</p>
                )}
                <p className="mt-3 text-sm font-semibold text-red-800">{t("keyWarning")}</p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="protection-counts">
                <h2 className="text-lg font-bold text-heading">{t("storedTitle")}</h2>
                <p className="mt-1 text-sm text-gray-800">{t("totals", { protected: status.protectedTotal, unprotected: status.unprotectedTotal })}</p>
                <ul className="mt-3 divide-y divide-gray-100 text-sm">
                  {status.sources.filter((s) => s.protected + s.unprotected > 0).map((s) => (
                    <li key={s.key} className="flex justify-between gap-3 py-1.5"><span className="text-gray-800">{t(`source.${s.key}`)}</span><span className="text-gray-700">{t("counts", { protected: s.protected, unprotected: s.unprotected })}</span></li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <Button type="button" variant="gradientCta" size="compact" disabled={running || !status.configured || status.unprotectedTotal === 0} onClick={run}>{running ? t("working") : t("protect")}</Button>
                {status.configured && status.unprotectedTotal === 0 && <p className="text-sm font-semibold text-emerald-800" role="status">{t("allProtected")}</p>}
              </div>
            </>
          )}
          {progress && (
            <div role="status" className="rounded-2xl bg-white p-6 shadow-sm" data-testid="protection-result">
              <p className="text-sm text-gray-800">{t("progress", { done: progress.done, failed: progress.failed })}</p>
              {progress.finished && <p className="mt-2 text-sm font-semibold text-emerald-800">{progress.failed > 0 ? t("finishedWithFailures", { failed: progress.failed }) : t("finished")}</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
