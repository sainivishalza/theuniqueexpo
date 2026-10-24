"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";

interface Sizes { sources: { table: string; column: string; count: number; bytes: number }[]; totalBytes: number; totalCount: number }
interface Batch { next: string | null; scanned: number; changed: number; before: number; after: number; kept: number }
interface Totals { scanned: number; changed: number; before: number; after: number }

const mb = (n: number) => (n / 1_048_576).toFixed(1);

// Admin -> Pictures: the pictures uploaded for the website are resized when they are saved; this screen does the same for the ones
// already stored. "Check" only measures; "Make smaller" replaces a picture only when the new copy is clearly smaller.
export default function AdminImageOptimizerPage() {
  const t = useTranslations("adminPictures");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [sizes, setSizes] = useState<Sizes | null>(null);
  const [failed, setFailed] = useState(false);
  const [running, setRunning] = useState<"" | "check" | "apply">("");
  const [totals, setTotals] = useState<(Totals & { mode: "check" | "apply"; finished: boolean }) | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/image-optimizer", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setSizes)
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  async function run(mode: "check" | "apply") {
    setRunning(mode);
    setFailed(false);
    let cursor: string | null = null;
    const sum: Totals = { scanned: 0, changed: 0, before: 0, after: 0 };
    setTotals({ ...sum, mode, finished: false });
    try {
      for (let i = 0; i < 2000; i++) {
        const res = await fetch("/api/admin/image-optimizer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cursor, apply: mode === "apply" }) });
        if (!res.ok) throw new Error();
        const b: Batch = await res.json();
        sum.scanned += b.scanned; sum.changed += b.changed; sum.before += b.before; sum.after += b.after;
        setTotals({ ...sum, mode, finished: b.next === null });
        if (b.next === null) break;
        cursor = b.next;
      }
      if (mode === "apply") load();
    } catch {
      setFailed(true);
    } finally {
      setRunning("");
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
          <Link href="/admin" className="py-1 text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-3xl px-6 space-y-5">
          <p className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-sm">{t("how")}</p>
          {failed && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{t("failed")}</p>}
          {sizes && (
            <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="pictures-sizes">
              <h2 className="text-lg font-bold text-heading">{t("storedTitle")}</h2>
              <p className="mt-1 text-3xl font-extrabold text-heading">{t("mb", { n: mb(sizes.totalBytes) })}</p>
              <p className="text-sm text-gray-700">{t("count", { count: sizes.totalCount })}</p>
              <ul className="mt-3 divide-y divide-gray-100 text-sm">
                {sizes.sources.filter((s) => s.count > 0).map((s) => (
                  <li key={`${s.table}.${s.column}`} className="flex justify-between gap-3 py-1.5"><span className="text-gray-800">{t(`source.${s.table}`)}</span><span className="text-gray-700">{t("mb", { n: mb(s.bytes) })} · {s.count}</span></li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondaryOutline" size="compact" disabled={!!running} onClick={() => run("check")}>{running === "check" ? t("working") : t("check")}</Button>
            <Button type="button" variant="gradientCta" size="compact" disabled={!!running} onClick={() => run("apply")}>{running === "apply" ? t("working") : t("apply")}</Button>
          </div>
          {totals && (
            <div role="status" className="rounded-2xl bg-white p-6 shadow-sm" data-testid="pictures-result">
              <h2 className="text-lg font-bold text-heading">{totals.mode === "check" ? t("checkResult") : t("applyResult")}</h2>
              <p className="mt-1 text-sm text-gray-800">{t("resultLine", { scanned: totals.scanned, changed: totals.changed, before: mb(totals.before), after: mb(totals.after) })}</p>
              {totals.finished && <p className="mt-2 text-sm font-semibold text-emerald-800">{totals.mode === "check" ? t("checkDone", { saved: mb(Math.max(0, totals.before - totals.after)) }) : t("applyDone", { saved: mb(Math.max(0, totals.before - totals.after)) })}</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
