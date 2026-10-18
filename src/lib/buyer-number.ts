// Buyer registration numbers: TUE0001, TUE0002, ... The database keeps the plain
// number (users.buyer_no); this adds / reads the "TUE" + zero padding. Safe to use
// in the browser as well as on the server.

export const BUYER_NUMBER_PREFIX = "TUE";
const MIN_DIGITS = 4;

export function formatBuyerNumber(no: number | string | null | undefined): string {
  const n = Number(no);
  if (!no || !Number.isInteger(n) || n <= 0) return "";
  return `${BUYER_NUMBER_PREFIX}${String(n).padStart(MIN_DIGITS, "0")}`;
}

// "TUE0007", "tue7", " 0007 " and "7" all mean buyer number 7.
export function parseBuyerNumber(text: string): number | null {
  const m = /^\s*(?:TUE)?\s*0*(\d{1,9})\s*$/i.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 ? n : null;
}

const MAX_RANGE = 20000;

// Pulls every buyer number out of free text pasted from a sheet or a message:
// "TUE0001, TUE0004", one per line, or ranges like "TUE0010-TUE0025" / "10 - 25".
// Anything that is not a number is ignored. Returns the numbers (no duplicates).
export function extractBuyerNumbers(text: string): number[] {
  const found = new Set<number>();
  const re = /(?:TUE)?\s*0*(\d{1,9})(?:\s*(?:-|–|—|\bto\b)\s*(?:TUE)?\s*0*(\d{1,9}))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const from = Number(m[1]);
    const to = m[2] !== undefined ? Number(m[2]) : from;
    if (from <= 0 || to <= 0) continue;
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    for (let n = lo; n <= hi && n - lo < MAX_RANGE; n++) found.add(n);
  }
  return Array.from(found);
}
