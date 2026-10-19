// Dates shown to visitors, written for the language of the page they are on.
//
// English keeps the wording the site has always used ("March 29–31, 2026").
// Russian comes from Intl (month names in the right case, "г.", the range dash).
// Chinese is written out in the site's own style -- a space between each number and
// the character after it ("2026 年 3 月 29 日至 31 日"), as in the rest of the Chinese
// text. Intl would give "2026/3/29 – 2026/3/31" for a Chinese range.
//
// Exhibition and tour days are calendar days, so they are worked out in UTC: the same
// text comes out on the server and in the browser, whatever the time zone. No imports,
// so this is safe to use from both server and client code.

interface Day {
  y: number;
  m: number;
  d: number;
}

function isRuOrZh(locale: string | undefined): locale is "ru" | "zh" {
  return locale === "ru" || locale === "zh";
}

// "2026-03-29", "2026-03-29T00:00:00.000Z" or a Date -> that calendar day (null if it is none).
function toDay(value: string | Date | null | undefined): Day | null {
  if (!value) return null;
  const text = value instanceof Date ? (Number.isNaN(value.getTime()) ? "" : value.toISOString()) : String(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return match ? { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) } : null;
}

// Intl puts narrow no-break spaces (U+202F) in some Russian ranges: plain spaces keep the
// text uniform and searchable.
function plain(text: string): string {
  return text.replace(/[\u00a0\u202f\u2009]/g, " ");
}

function sameDay(a: Day, b: Day): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

function utcDate(day: Day): Date {
  return new Date(Date.UTC(day.y, day.m - 1, day.d));
}

function zhDay(day: Day, withYear = true): string {
  return `${withYear ? `${day.y} 年 ` : ""}${day.m} 月 ${day.d} 日`;
}

function zhRange(s: Day, e: Day, withYear: boolean): string {
  if (sameDay(s, e)) return zhDay(s, withYear);
  if (s.y !== e.y) return `${zhDay(s)}至 ${zhDay(e)}`;
  const head = withYear ? `${s.y} 年 ` : "";
  if (s.m === e.m) return `${head}${s.m} 月 ${s.d} 日至 ${e.d} 日`;
  return `${head}${s.m} 月 ${s.d} 日至 ${e.m} 月 ${e.d} 日`;
}

function ruRange(s: Day, e: Day, withYear: boolean): string {
  const format = new Intl.DateTimeFormat("ru", { ...(withYear && { year: "numeric" as const }), month: "long", day: "numeric", timeZone: "UTC" });
  if (sameDay(s, e)) return plain(format.format(utcDate(s)));
  // "29–31 марта 2026 г." / "29 марта – 2 апреля 2026 г." -- formatRange is missing on
  // some very old browsers, which get the plain two-date form instead.
  return plain(
    typeof format.formatRange === "function"
      ? format.formatRange(utcDate(s), utcDate(e))
      : `${format.format(utcDate(s))} – ${format.format(utcDate(e))}`
  );
}

// The English wording, unchanged from before (apart from a one-day show, which used to
// read "October 16–16, 2026").
function englishRange(start: string | Date, end: string | Date): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  if (s.getTime() === e.getTime()) {
    return `${s.toLocaleDateString("en-US", opts)}, ${e.getFullYear()}`;
  }
  if (s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString("en-US", opts)}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}, ${e.getFullYear()}`;
}

// "March 29–31, 2026" / "29–31 марта 2026 г." / "2026 年 3 月 29 日至 31 日"
export function formatDateRange(start: string | Date, end: string | Date, locale?: string): string {
  if (isRuOrZh(locale)) {
    const s = toDay(start);
    const e = toDay(end);
    if (s && e) return locale === "ru" ? ruRange(s, e, true) : zhRange(s, e, true);
  }
  return englishRange(start, end);
}

// The same without the year, for small date tags: "March 29–31" / "29–31 марта" / "3 月 29 日至 31 日"
export function formatDateRangeShort(start: string | Date, end: string | Date, locale?: string): string {
  if (isRuOrZh(locale)) {
    const s = toDay(start);
    const e = toDay(end);
    if (s && e) return locale === "ru" ? ruRange(s, e, false) : zhRange(s, e, false);
  }
  return englishRange(start, end).split(",")[0];
}

// A calendar day typed as 2026-09-05 (an RFQ deadline, say), written for the page's
// language. English is returned as it came.
export function localizeDay(value: string, locale: string | undefined): string {
  if (!isRuOrZh(locale)) return value;
  const day = toDay(value);
  if (!day) return value;
  return locale === "ru" ? ruRange(day, day, true) : zhDay(day);
}

// A moment in time (a post's publish time, a message's sent time) as a date, in the
// viewer's time zone. English is the browser's own short date, exactly as before.
export function formatInstantDate(value: string | number | Date, locale: string | undefined): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!isRuOrZh(locale)) return date.toLocaleDateString();
  if (Number.isNaN(date.getTime())) return "";
  if (locale === "ru") return plain(new Intl.DateTimeFormat("ru", { year: "numeric", month: "long", day: "numeric" }).format(date));
  return zhDay({ y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() });
}

// The same with the time of day.
export function formatInstantDateTime(value: string | number | Date, locale: string | undefined): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!isRuOrZh(locale)) return date.toLocaleString();
  if (Number.isNaN(date.getTime())) return "";
  if (locale === "ru") return plain(new Intl.DateTimeFormat("ru", { dateStyle: "long", timeStyle: "short" }).format(date));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatInstantDate(date, "zh")} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
