// Content that lives in the database or in data files (blog posts, FAQ, China
// Travel, subsidies, visa services, exhibition names ...) is written once, in
// English. The Russian and Chinese versions are kept in dictionaries keyed by
// the exact English text, and swapped in when a page is shown in that
// language. Text with no entry -- including anything an admin has since edited
// -- simply stays as written, so a translation of old wording can never
// replace new wording.

export type Dictionary = Record<string, string>;

export function translateText(dict: Dictionary, text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  const whole = dict[trimmed];
  if (whole !== undefined) return text.replace(trimmed, () => whole);
  // Long markdown bodies are translated paragraph by paragraph.
  if (/\n\s*\n/.test(text)) {
    return text
      .split(/(\n\s*\n)/)
      .map((part) => (/^\n\s*\n$/.test(part) ? part : translateBlock(dict, part)))
      .join("");
  }
  return text;
}

function translateBlock(dict: Dictionary, block: string): string {
  const trimmed = block.trim();
  const hit = dict[trimmed];
  return hit !== undefined ? block.replace(trimmed, () => hit) : block;
}

export function deepTranslate<T>(dict: Dictionary, value: T): T {
  if (typeof value === "string") return translateText(dict, value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepTranslate(dict, v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepTranslate(dict, v);
    return out as T;
  }
  return value;
}
