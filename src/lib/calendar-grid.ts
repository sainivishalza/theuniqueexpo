// The cells of a month calendar, Monday first, in UTC (so a date never shifts by a day). No imports: usable in the browser and in tests.

export interface MonthCell {
  /** YYYY-MM-DD */
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** "2026-03" -> whole weeks (a multiple of 7 cells) covering that month, starting on the Monday on or before the 1st. */
export function monthGrid(month: string): MonthCell[] {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return [];
  const year = Number(m[1]);
  const index = Number(m[2]) - 1;
  const firstDay = new Date(Date.UTC(year, index, 1));
  const lead = (firstDay.getUTCDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const cells: MonthCell[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(Date.UTC(year, index, 1 - lead + i));
    cells.push({ date: iso(d), dayOfMonth: d.getUTCDate(), inMonth: d.getUTCMonth() === index });
  }
  return cells;
}

/** "2026-12" shifted by +1 -> "2027-01". */
export function shiftMonth(month: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
