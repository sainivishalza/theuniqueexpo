// Plain-text search over lists of records, shared by the admin back office and the public
// pages. A record is searched by every readable value in it (names, e-mail, status, city,
// notes, ...), so a page does not have to say which fields count. Several words must all
// appear (in any order), capitals and accents do not matter, and Chinese text works as it is.
// No imports, so it is safe in server and browser code.

// Never part of what is searched: pictures, files, secrets and styling values.
const SKIPPED_KEYS = /image|photo|avatar|logo|icon|favicon|colou?r|password|hash|token|secret|^doc|^file|proof|receipt|qr|svg|thumbnail|poster|gallery/i;
const MAX_VALUE_LENGTH = 4000;
const MAX_DEPTH = 4;

export function normalizeText(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function queryWords(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

function collect(value: unknown, depth: number, out: string[]): void {
  if (value === null || value === undefined || depth > MAX_DEPTH) return;
  if (typeof value === "string") {
    if (value.length > 0 && value.length <= MAX_VALUE_LENGTH && !value.startsWith("data:")) out.push(value);
  } else if (typeof value === "number") {
    out.push(String(value));
  } else if (Array.isArray(value)) {
    for (const item of value) collect(item, depth + 1, out);
  } else if (typeof value === "object") {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (!SKIPPED_KEYS.test(key)) collect(inner, depth + 1, out);
    }
  }
}

const cache = new WeakMap<object, string>();

// Everything searchable in one record, lower-cased, as one string. Kept per record object, so
// typing in the box does not rebuild it.
export function searchableText(record: unknown, extra?: string): string {
  if (record !== null && typeof record === "object" && !extra) {
    const hit = cache.get(record);
    if (hit !== undefined) return hit;
  }
  const parts: string[] = [];
  collect(record, 0, parts);
  if (extra) parts.push(extra);
  const text = normalizeText(parts.join(" \n "));
  if (record !== null && typeof record === "object" && !extra) cache.set(record, text);
  return text;
}

export function matchesQuery(record: unknown, query: string, extra?: string): boolean {
  const words = queryWords(query);
  if (words.length === 0) return true;
  const text = searchableText(record, extra);
  return words.every((w) => text.includes(w));
}

export function filterByQuery<T>(items: T[], query: string, extra?: (item: T) => string): T[] {
  const words = queryWords(query);
  if (words.length === 0) return items;
  return items.filter((item) => {
    const text = searchableText(item, extra ? extra(item) : undefined);
    return words.every((w) => text.includes(w));
  });
}
