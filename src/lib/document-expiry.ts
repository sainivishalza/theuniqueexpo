// Will a buyer's passport and visa cover an exhibition? Most countries ask for a passport that is still valid six months
// after arrival, and a visa has to last for the whole stay. Dates on profiles are typed or imported, so only a clear
// YYYY-MM-DD is judged; anything else (or nothing) is never flagged. Shared by the daily alerts and the screens.

export const PASSPORT_MONTHS_AFTER = 6;

export type DocumentProblem = "passport" | "visa";

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** A YYYY-MM-DD day as a UTC date, or null when it is not a real day. */
export function parseDay(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const m = DAY_RE.exec(value.trim());
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return date.getUTCFullYear() === Number(m[1]) && date.getUTCMonth() === Number(m[2]) - 1 && date.getUTCDate() === Number(m[3]) ? date : null;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** The problems (if any) with these documents for an exhibition ending on `expoEnd` (YYYY-MM-DD). */
export function documentProblems(input: { passportExpires?: string | null; visaExpires?: string | null; expoEnd: string }): DocumentProblem[] {
  const end = parseDay(input.expoEnd);
  if (!end) return [];
  const problems: DocumentProblem[] = [];
  const passport = parseDay(input.passportExpires);
  if (passport && passport < addMonths(end, PASSPORT_MONTHS_AFTER)) problems.push("passport");
  const visa = parseDay(input.visaExpires);
  if (visa && visa < end) problems.push("visa");
  return problems;
}
