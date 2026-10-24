"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Stats {
  buyers: { total: number; last7Days: number; last30Days: number };
  buyersPerWeek: number[];
  registrations: { total: number; last7Days: number; byStatus: Record<string, number> };
  topExhibitions: { id: number; title: string; slug: string; registrations: number }[];
  pointsHeld: number;
}

const STATUS_ORDER = ["pending", "approved", "confirmed", "attended", "rejected", "cancelled", "absent"];

// "At a glance" on the admin home: how many buyers and registrations, how fast they are growing, and which
// exhibitions are the most registered for. Every bar is also written out as a number.
export default function GlancePanel() {
  const t = useTranslations("adminHome.glance");
  const locale = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => alive && data && setStats(data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!stats) return null;
  const n = (v: number) => v.toLocaleString(locale);
  const weekMax = Math.max(1, ...stats.buyersPerWeek);
  const topMax = Math.max(1, ...stats.topExhibitions.map((e) => e.registrations));
  const statuses = STATUS_ORDER.filter((s) => (stats.registrations.byStatus[s] ?? 0) > 0);

  return (
    <section aria-labelledby="glance-title" className="mx-auto max-w-7xl px-6 pt-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 id="glance-title" className="text-lg font-bold text-heading">{t("title")}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <dt className="text-sm text-gray-600">{t("buyers")}</dt>
            <dd className="text-2xl font-extrabold text-heading">{n(stats.buyers.total)}</dd>
            <dd className="text-xs text-gray-600">{t("newBuyers", { week: n(stats.buyers.last7Days), month: n(stats.buyers.last30Days) })}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">{t("registrations")}</dt>
            <dd className="text-2xl font-extrabold text-heading">{n(stats.registrations.total)}</dd>
            <dd className="text-xs text-gray-600">{t("newRegistrations", { week: n(stats.registrations.last7Days) })}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">{t("pointsHeld")}</dt>
            <dd className="text-2xl font-extrabold text-heading">{n(stats.pointsHeld)}</dd>
            <dd className="text-xs text-gray-600">{t("pointsHeldNote")}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">{t("byStatus")}</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {statuses.length === 0 ? (
                <span className="text-gray-600">{t("none")}</span>
              ) : (
                statuses.map((s) => (
                  <span key={s} className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-900">
                    {t(`status.${s}`)} {n(stats.registrations.byStatus[s])}
                  </span>
                ))
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-heading">{t("perWeek")}</h3>
            <ol className="mt-2 flex h-24 items-end gap-1.5" aria-label={t("perWeek")}>
              {stats.buyersPerWeek.map((v, i) => {
                const ago = stats.buyersPerWeek.length - 1 - i;
                return (
                  <li key={i} className="flex h-full flex-1 flex-col justify-end text-center" title={t("weekTitle", { count: v, ago })}>
                    <span className="text-[11px] font-semibold text-gray-700">{n(v)}</span>
                    <span className="mt-0.5 block rounded-t bg-emerald-600" style={{ height: `${Math.max(4, Math.round((v / weekMax) * 64))}px` }} aria-hidden="true" />
                    <span className="sr-only">{t("weekTitle", { count: v, ago })}</span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-1 text-xs text-gray-600">{t("perWeekNote")}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-heading">{t("topExhibitions")}</h3>
            {stats.topExhibitions.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">{t("none")}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {stats.topExhibitions.map((e) => (
                  <li key={e.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <Link href={`/admin/exhibitions/${e.slug}/registrations`} className="py-1 min-w-0 truncate font-semibold text-emerald-900 underline hover:text-emerald-800">{e.title}</Link>
                      <span className="shrink-0 font-bold text-heading">{n(e.registrations)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100" aria-hidden="true">
                      <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.max(3, Math.round((e.registrations / topMax) * 100))}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
