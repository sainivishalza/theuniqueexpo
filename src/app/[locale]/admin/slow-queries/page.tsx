"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/client/registration-format";
import Button from "@/components/ui/Button";

interface Q { id: number; sql: string; calls: number; totalMs: number; avgMs: number; maxMs: number; lastMs: number; firstAt: string; lastAt: string }

// The database queries that took unusually long, grouped by what they look like. For the person who looks after the site.
export default function AdminSlowQueriesPage() {
  const t = useTranslations("adminSlowQueries");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const [queries, setQueries] = useState<Q[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setFailed(false);
    fetch("/api/admin/slow-queries", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setQueries(d.queries ?? []))
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  async function clear() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/slow-queries", { method: "DELETE" });
      if (res.ok) {
        setQueries([]);
        setMessage(t("cleared"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-700">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-5xl px-6">
          <Link href="/admin" className="py-1 text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-5xl px-6 space-y-5">
          <p className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-sm">{t("how")}</p>
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</p>}
          {failed && <p role="alert" className="text-red-700">{t("loadFailed")}</p>}
          {!queries && !failed && <p className="text-gray-700">{ta("loading")}</p>}
          {queries && queries.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-gray-700 shadow-sm" data-testid="no-slow-queries">{t("none")}</p>}
          <ul className="space-y-3">
            {(queries ?? []).map((q) => (
              <li key={q.id} className="rounded-2xl bg-white p-5 shadow-sm" data-testid="slow-query">
                <p className="text-sm font-semibold text-heading">{t("summary", { calls: q.calls, avg: q.avgMs, max: q.maxMs, total: Math.round(q.totalMs / 1000) })}</p>
                <p className="mt-1 text-xs text-gray-600">{t("seen", { last: formatDateTime(q.lastAt, locale), first: formatDateTime(q.firstAt, locale) })}</p>
                <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800 whitespace-pre-wrap [overflow-wrap:anywhere]" tabIndex={0}>{q.sql}</pre>
              </li>
            ))}
          </ul>
          {queries && queries.length > 0 && <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={clear}>{t("clear")}</Button>}
        </div>
      </section>
    </div>
  );
}
