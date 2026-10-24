"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { HEALTHY_SHARE, MIN_SAMPLES } from "@/lib/web-vitals";

interface Row { page: string; device: string; metric: string; samples: number; good: number; needs: number; poor: number; average: number; goodShare: number; healthy: boolean | null }
const SHOWN = ["LCP", "INP", "CLS"];

// How fast pages feel to real visitors: for each kind of page, on phones and computers, how many page views were good for
// loading (LCP), answering taps (INP) and staying still (CLS). Google calls a measure healthy when at least 75% are good.
export default function AdminPageSpeedPage() {
  const t = useTranslations("adminPageSpeed");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [days, setDays] = useState<7 | 28>(7);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback((d: number) => {
    setFailed(false);
    fetch(`/api/admin/page-speed?days=${d}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setRows(data.rows ?? []);
        setAvailable(data.available !== false);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (user?.role === "admin") load(days);
  }, [user, days, load]);

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-700">{ta("accessRequired")}</p></div>;
  }

  const pages = [...new Set((rows ?? []).map((r) => r.page))];
  const value = (r: Row) => (r.metric === "CLS" ? r.average.toFixed(2) : r.average >= 1000 ? t("seconds", { n: (r.average / 1000).toFixed(1) }) : t("ms", { n: Math.round(r.average) }));
  const verdict = (r: Row) => (r.healthy === null ? t("notEnough", { min: MIN_SAMPLES }) : r.healthy ? t("healthy") : t("slow"));

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin" className="py-1 text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-4xl px-6 space-y-5">
          <p className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-sm">{t("how", { share: Math.round(HEALTHY_SHARE * 100) })}</p>
          <div className="flex gap-2" role="group" aria-label={t("period")}>
            {([7, 28] as const).map((d) => (
              <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${days === d ? "bg-emerald-900 text-white" : "bg-white text-gray-800 shadow-sm"}`}>{t("lastDays", { days: d })}</button>
            ))}
          </div>
          {failed && <p role="alert" className="text-red-700">{t("loadFailed")}</p>}
          {!rows && !failed && <p className="text-gray-700">{ta("loading")}</p>}
          {rows && !available && <p className="rounded-xl bg-white p-6 text-center text-gray-700 shadow-sm">{t("unavailable")}</p>}
          {rows && available && pages.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-gray-700 shadow-sm" data-testid="no-speed-data">{t("none")}</p>}
          <ul className="space-y-4">
            {pages.map((page) => (
              <li key={page} className="rounded-2xl bg-white p-5 shadow-sm" data-testid="speed-page">
                <h2 className="text-lg font-bold text-heading [overflow-wrap:anywhere]">{page === "home" ? t("home") : `/${page}`}</h2>
                {(["phone", "desktop"] as const).map((device) => {
                  const mine = (rows ?? []).filter((r) => r.page === page && r.device === device && SHOWN.includes(r.metric));
                  if (mine.length === 0) return null;
                  return (
                    <div key={device} className="mt-3">
                      <h3 className="text-sm font-semibold text-gray-800">{t(device)}</h3>
                      <ul className="mt-1 divide-y divide-gray-100">
                        {SHOWN.map((m) => mine.find((r) => r.metric === m)).filter((r): r is Row => !!r).map((r) => (
                          <li key={r.metric} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm" data-testid={`speed-${page}-${device}-${r.metric}`}>
                            <span className="font-semibold text-heading">{t(`metric.${r.metric}`)}</span>
                            <span className="text-gray-800">{t("share", { share: Math.round(r.goodShare * 100), samples: r.samples, value: value(r) })}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.healthy === null ? "bg-gray-100 text-gray-800" : r.healthy ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>{verdict(r)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
