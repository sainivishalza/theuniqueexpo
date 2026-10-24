"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/client/registration-format";
import Button from "@/components/ui/Button";

interface Err { id: number; source: "server" | "client"; message: string; detail: string; path: string; userAgent: string; occurrences: number; firstAt: string; lastAt: string; resolved: boolean }

// The errors the website reported, one row per kind of error, with how often and when.
export default function AdminErrorsPage() {
  const t = useTranslations("adminErrors");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const [errors, setErrors] = useState<Err[] | null>(null);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    fetch(`/api/admin/errors${all ? "?all=1" : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setErrors(d.errors ?? []))
      .catch(() => setFailed(true));
  }, [all]);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  async function resolve(e: Err, resolved: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/errors${all ? "?all=1" : ""}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: e.id, resolved }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setErrors(d.errors ?? []);
        setMessage(resolved ? t("resolvedNote") : t("reopenedNote"));
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
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="h-4 w-4" />
            {t("showResolved")}
          </label>
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</p>}
          {failed && <p role="alert" className="text-red-700">{t("loadFailed")}</p>}
          {!errors && !failed && <p className="text-gray-700">{ta("loading")}</p>}
          {errors && errors.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-gray-700 shadow-sm" data-testid="no-errors">{t("none")}</p>}
          <ul className="space-y-3">
            {(errors ?? []).map((e) => (
              <li key={e.id} className="rounded-2xl bg-white p-5 shadow-sm" data-testid="error-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-heading [overflow-wrap:anywhere]">
                      <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-bold ${e.source === "server" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>{t(`source.${e.source}`)}</span>
                      {e.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-700">{t("times", { count: e.occurrences, last: formatDateTime(e.lastAt, locale), first: formatDateTime(e.firstAt, locale) })}</p>
                    {e.path && <p className="text-xs text-gray-600 [overflow-wrap:anywhere]">{t("where", { path: e.path })}</p>}
                    {e.resolved && <p className="text-xs font-semibold text-emerald-800">{t("isResolved")}</p>}
                  </div>
                  <div className="flex gap-2">
                    {e.detail && <Button type="button" variant="secondaryOutline" size="xs" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? t("hideDetails") : t("details")}</Button>}
                    <Button type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={() => resolve(e, !e.resolved)}>{e.resolved ? t("reopen") : t("resolve")}<span className="sr-only"> — {e.message.slice(0, 60)}</span></Button>
                  </div>
                </div>
                {open === e.id && <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800 whitespace-pre-wrap [overflow-wrap:anywhere]" tabIndex={0}>{e.detail}</pre>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
