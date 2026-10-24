"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { fieldClasses } from "@/components/ui/FormField";

interface Insights {
  days: number;
  perDay: { day: string; count: number }[];
  byCountry: { country: string; count: number }[];
  byExhibition: { id: number; title: string; slug: string; registrations: number; approved: number; attended: number }[];
  funnel: { registered: number; approved: number; confirmed: number; attended: number };
  total: number;
  exhibitions: { id: number; title: string }[];
}

const STEPS = ["registered", "approved", "confirmed", "attended"] as const;

// Reports: how registrations are coming in, where from, for which exhibitions, and how far they get. Every bar is
// also written as a number (and the per-day chart has a table), so nothing depends on seeing the colours.
export default function AdminInsightsPage() {
  const t = useTranslations("adminInsights");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const ids = { days: useId(), expo: useId() };
  const [days, setDays] = useState("30");
  const [expo, setExpo] = useState("");
  const [data, setData] = useState<Insights | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let alive = true;
    setFailed(false);
    fetch(`/api/admin/insights?days=${days}${expo ? `&exhibition=${expo}` : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [user, days, expo]);

  const n = (v: number) => v.toLocaleString(locale);
  // A year of single days would be hairlines: show weeks then.
  const buckets = useMemo(() => {
    if (!data) return [];
    if (data.days <= 90) return data.perDay.map((d) => ({ label: d.day, count: d.count }));
    const out: { label: string; count: number }[] = [];
    for (let i = 0; i < data.perDay.length; i += 7) {
      const chunk = data.perDay.slice(i, i + 7);
      out.push({ label: `${chunk[0].day} – ${chunk[chunk.length - 1].day}`, count: chunk.reduce((s, c) => s + c.count, 0) });
    }
    return out;
  }, [data]);

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const countryMax = Math.max(1, ...(data?.byCountry ?? []).map((c) => c.count));
  const expoMax = Math.max(1, ...(data?.byExhibition ?? []).map((e) => e.registrations));
  const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-6xl px-6">
          <Link href="/admin" className="py-1 text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-6xl px-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <div>
              <label htmlFor={ids.days} className="mb-1.5 block text-sm font-medium text-gray-700">{t("period")}</label>
              <select id={ids.days} value={days} onChange={(e) => setDays(e.target.value)} className={fieldClasses()}>
                {["30", "90", "365"].map((d) => <option key={d} value={d}>{t("lastDays", { days: d })}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={ids.expo} className="mb-1.5 block text-sm font-medium text-gray-700">{t("exhibition")}</label>
              <select id={ids.expo} value={expo} onChange={(e) => setExpo(e.target.value)} className={fieldClasses()}>
                <option value="">{t("allExhibitions")}</option>
                {(data?.exhibitions ?? []).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </select>
            </div>
          </div>

          {failed && <p role="alert" className="text-red-700">{t("failed")}</p>}
          {!data && !failed && <p className="text-gray-600">{ta("loading")}</p>}

          {data && (
            <>
              <p className="text-sm text-gray-700" data-testid="insights-total">{t("total", { count: n(data.total) })}</p>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-heading">{data.days <= 90 ? t("perDay") : t("perWeek")}</h2>
                {data.total === 0 ? (
                  <p className="mt-3 text-sm text-gray-600">{t("none")}</p>
                ) : (
                  <>
                    <div className="mt-4 flex h-40 items-end gap-px" aria-hidden="true" data-testid="insights-bars">
                      {buckets.map((b) => (
                        <div key={b.label} className="flex h-full flex-1 flex-col justify-end" title={`${b.label}: ${b.count}`}>
                          <span className="block w-full rounded-t bg-emerald-600" style={{ height: `${b.count === 0 ? 2 : Math.max(4, Math.round((b.count / max) * 100))}%` }} />
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-600">{t("busiest", { count: n(max), label: buckets.find((b) => b.count === max)?.label ?? "" })}</p>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-emerald-800">{t("showNumbers")}</summary>
                      <div className="mt-2 max-h-64 overflow-auto">
                        <table className="w-full text-sm">
                          <caption className="sr-only">{data.days <= 90 ? t("perDay") : t("perWeek")}</caption>
                          <thead><tr><th scope="col" className="text-left py-1 pr-4">{t("date")}</th><th scope="col" className="text-left py-1">{t("registrations")}</th></tr></thead>
                          <tbody>{buckets.filter((b) => b.count > 0).map((b) => <tr key={b.label}><td className="py-0.5 pr-4 text-gray-700">{b.label}</td><td className="py-0.5 font-semibold">{n(b.count)}</td></tr>)}</tbody>
                        </table>
                      </div>
                    </details>
                  </>
                )}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="insights-funnel">
                <h2 className="text-lg font-bold text-heading">{t("funnel")}</h2>
                <p className="text-xs text-gray-600">{t("funnelNote")}</p>
                <ol className="mt-4 space-y-3">
                  {STEPS.map((step, i) => {
                    const v = data.funnel[step];
                    const prev = i === 0 ? v : data.funnel[STEPS[i - 1]];
                    return (
                      <li key={step} data-step={step}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                          <span className="font-semibold text-heading">{t(`steps.${step}`)}</span>
                          <span className="text-gray-700"><strong>{n(v)}</strong>{i > 0 && <> · {t("ofPrevious", { percent: pct(v, prev) })} · {t("ofAll", { percent: pct(v, data.funnel.registered) })}</>}</span>
                        </div>
                        <div className="mt-1 h-3 rounded bg-gray-100" aria-hidden="true"><div className="h-3 rounded bg-emerald-600" style={{ width: `${data.funnel.registered > 0 ? Math.max(1, Math.round((v / data.funnel.registered) * 100)) : 0}%` }} /></div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="insights-countries">
                  <h2 className="text-lg font-bold text-heading">{t("byCountry")}</h2>
                  {data.byCountry.length === 0 ? <p className="mt-3 text-sm text-gray-600">{t("none")}</p> : (
                    <ul className="mt-3 space-y-2">
                      {data.byCountry.map((c) => (
                        <li key={c.country || "other"}>
                          <div className="flex justify-between gap-2 text-sm"><span className="[overflow-wrap:anywhere]">{c.country || t("otherCountries")}</span><span className="font-semibold">{n(c.count)} · {pct(c.count, data.total)}</span></div>
                          <div className="mt-1 h-2 rounded bg-gray-100" aria-hidden="true"><div className="h-2 rounded bg-teal-600" style={{ width: `${Math.max(2, Math.round((c.count / countryMax) * 100))}%` }} /></div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="insights-exhibitions">
                  <h2 className="text-lg font-bold text-heading">{t("byExhibition")}</h2>
                  <p className="text-xs text-gray-600">{t("byExhibitionNote")}</p>
                  {data.byExhibition.length === 0 ? <p className="mt-3 text-sm text-gray-600">{t("none")}</p> : (
                    <ul className="mt-3 space-y-3">
                      {data.byExhibition.map((e) => (
                        <li key={e.id}>
                          <div className="flex justify-between gap-2 text-sm"><Link href={`/admin/exhibitions/${e.slug}/registrations`} className="font-semibold text-emerald-800 underline [overflow-wrap:anywhere]">{e.title}</Link><span className="font-semibold">{n(e.registrations)}</span></div>
                          <div className="mt-1 h-2 rounded bg-gray-100" aria-hidden="true"><div className="h-2 rounded bg-emerald-600" style={{ width: `${Math.max(2, Math.round((e.registrations / expoMax) * 100))}%` }} /></div>
                          <p className="mt-0.5 text-xs text-gray-600">{t("approvedAttended", { approved: n(e.approved), attended: n(e.attended) })}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
