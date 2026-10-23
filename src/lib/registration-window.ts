// When can buyers register for an exhibition? An admin switches registration on, and may also give a day it opens and
// a last day to register (both inclusive) and a number of places. This is the one place that decides, so the lists, the
// register pages, the API and the "closes in 5 days" badge all agree. Safe in the browser as well as on the server.

export type WindowState = "open" | "opens_later" | "deadline_passed" | "switched_off";

export interface WindowInput {
  /** The admin's own switch. */
  switchedOn: boolean;
  /** YYYY-MM-DD, or empty. */
  opens?: string | null;
  closes?: string | null;
}

export interface WindowInfo {
  state: WindowState;
  /** Registration can be made now. */
  open: boolean;
  opens: string | null;
  closes: string | null;
  /** Days from today to the last day (0 = today is the last day); null when there is no deadline or it has passed. */
  daysToClose: number | null;
  /** Days from today until it opens; null when it is open or has no opening day. */
  daysToOpen: number | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isDay = (v: unknown): v is string => typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const dayNumber = (v: string) => Math.floor(Date.parse(`${v}T00:00:00Z`) / 86400000);

export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function registrationWindow(input: WindowInput, today = todayUtc()): WindowInfo {
  const opens = isDay(input.opens) ? input.opens : null;
  const closes = isDay(input.closes) ? input.closes : null;
  const base = { opens, closes, daysToClose: null as number | null, daysToOpen: null as number | null };
  if (!input.switchedOn) return { ...base, state: "switched_off", open: false };
  if (opens && today < opens) return { ...base, state: "opens_later", open: false, daysToOpen: dayNumber(opens) - dayNumber(today) };
  if (closes && today > closes) return { ...base, state: "deadline_passed", open: false };
  return { ...base, state: "open", open: true, daysToClose: closes ? dayNumber(closes) - dayNumber(today) : null };
}

/** "Closes soon": a deadline within this many days. */
export const CLOSING_SOON_DAYS = 14;
export const MAX_BUYER_QUOTA = 100000;
