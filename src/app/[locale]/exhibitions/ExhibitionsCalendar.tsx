"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { monthGrid, shiftMonth, type MonthCell } from "@/lib/calendar-grid";

interface Item { id: string; slug: string; title: string; dates: string; city: string; startDate: string; endDate: string; color: string }

// A month at a glance: every day an exhibition runs is marked, a tap on a marked day lists what runs then, and the list under the
// grid shows the month's exhibitions. Dates are plain days (no times), so everything is worked out in UTC to avoid day shifts.
export default function ExhibitionsCalendar({ exhibitions }: { exhibitions: Item[] }) {
  const t = useTranslations("exhibitionsPage.calendar");
  const locale = useLocale();
  const today = new Date().toISOString().slice(0, 10);
  // Start on the month of the first exhibition that has not ended (or this month when none).
  const first = [...exhibitions].filter((e) => e.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const [cursor, setCursor] = useState(() => (first ? first.startDate.slice(0, 7) : today.slice(0, 7)));
  const [day, setDay] = useState<string | null>(null);

  const cells = useMemo(() => monthGrid(cursor), [cursor]);
  const onDay = (date: string) => exhibitions.filter((e) => e.startDate <= date && e.endDate >= date);
  const monthStart = cells.find((c) => c.inMonth)!.date;
  const monthEnd = [...cells].reverse().find((c) => c.inMonth)!.date;
  const inMonth = exhibitions.filter((e) => e.startDate <= monthEnd && e.endDate >= monthStart).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const listed = day ? onDay(day) : inMonth;

  const fmtMonth = (key: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));
  const fmtDay = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  // Monday first: 2024-01-01 was a Monday.
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i));
    return { short: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(d), long: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(d) };
  });

  const go = (delta: number) => {
    setCursor((c) => shiftMonth(c, delta));
    setDay(null);
  };

  const cell = (c: MonthCell) => {
    const here = onDay(c.date);
    const classes = `flex h-11 w-full flex-col items-center justify-center rounded-lg text-sm ${c.inMonth ? "text-gray-900" : "text-gray-600"} ${c.date === today ? "ring-2 ring-emerald-700" : ""}`;
    if (here.length === 0) return <span className={classes}>{c.dayOfMonth}</span>;
    const selected = day === c.date;
    return (
      <button
        type="button"
        aria-pressed={selected}
        aria-label={t("day", { date: fmtDay(c.date), count: here.length })}
        onClick={() => setDay(selected ? null : c.date)}
        data-testid={`cal-day-${c.date}`}
        className={`${classes} font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 ${selected ? "bg-emerald-900 text-white" : "bg-emerald-100 text-emerald-950 hover:bg-emerald-200"}`}
      >
        <span aria-hidden="true">{c.dayOfMonth}</span>
        <span aria-hidden="true" className="mt-0.5 flex gap-0.5">
          {here.slice(0, 3).map((e) => (
            <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-white" : "bg-emerald-800"}`} />
          ))}
        </span>
      </button>
    );
  };

  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <div data-testid="exhibitions-calendar">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => go(-1)} aria-label={t("prev")} className="h-11 w-11 rounded-full border border-gray-300 text-lg font-bold text-gray-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900"><span aria-hidden="true">‹</span></button>
          <h2 className="text-center text-lg font-bold text-heading" aria-live="polite" data-testid="cal-month">{fmtMonth(cursor)}</h2>
          <button type="button" onClick={() => go(1)} aria-label={t("next")} className="h-11 w-11 rounded-full border border-gray-300 text-lg font-bold text-gray-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900"><span aria-hidden="true">›</span></button>
        </div>
        <table className="w-full table-fixed border-separate border-spacing-y-1">
          <thead>
            <tr>
              {weekdays.map((w) => (
                <th key={w.long} scope="col" className="pb-1 text-center text-xs font-semibold text-gray-700"><abbr title={w.long} className="no-underline">{w.short}</abbr></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].date}>
                {week.map((c) => <td key={c.date} className="p-0.5">{cell(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mx-auto mt-6 max-w-3xl" data-testid="cal-list">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold text-heading">{day ? t("listDay", { date: fmtDay(day) }) : t("listMonth", { month: fmtMonth(cursor) })}</h3>
          {day && <button type="button" onClick={() => setDay(null)} className="py-1 text-sm font-semibold text-emerald-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900">{t("wholeMonth")}</button>}
        </div>
        {listed.length === 0 ? (
          <p className="mt-3 text-gray-700">{t("empty")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {listed.map((e) => (
              <li key={e.id} className="rounded-xl bg-white p-4 shadow-sm">
                <Link href={`/exhibitions/${e.slug}`} className="font-bold text-emerald-800 hover:underline">{e.title}</Link>
                <p className="text-sm text-gray-700">{e.dates} · {e.city}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
