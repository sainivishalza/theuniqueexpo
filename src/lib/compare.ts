// Which exhibitions to compare: the names come from the address (?slugs=a,b,c), so they are cleaned up first.
export const COMPARE_MIN = 2;
export const COMPARE_MAX = 3;

/** "a,b,a,c,d" -> ["a","b","c"]: no blanks, no repeats, at most three, in the order given. */
export function parseCompareSlugs(raw: string | undefined | null): string[] {
  const out: string[] = [];
  for (const part of String(raw ?? "").split(",")) {
    const s = part.trim().slice(0, 200);
    if (s && !out.includes(s)) out.push(s);
    if (out.length === COMPARE_MAX) break;
  }
  return out;
}

export function compareHref(slugs: string[]): string {
  return `/exhibitions/compare?slugs=${slugs.map(encodeURIComponent).join(",")}`;
}
