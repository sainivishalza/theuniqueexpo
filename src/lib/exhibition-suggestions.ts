// Which exhibitions to suggest to a buyer: the ones in a line of business they have already registered for, and the
// ones whose industry shares a word with what their profile says about their business. Safe in the browser too.

export interface Suggestion {
  /** "history": an exhibition in the same industry was registered for before; "profile": it matches the profile. */
  reason: "history" | "profile";
  /** The profile text that matched (the business field, or a purchase interest). */
  field?: string;
}

// Words too general to mean anything on their own.
const STOP = new Set([
  "and", "the", "for", "with", "company", "companies", "business", "general", "goods", "trade", "product", "products",
  "industry", "equipment", "equipments", "other", "market", "sales", "sourcing", "supply", "services", "service",
]);

const norm = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export function industryWords(text: string): Set<string> {
  return new Set(
    norm(text)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 4 && !STOP.has(w))
  );
}

/**
 * `industry` is the exhibition's industry (as entered, not translated). `history` holds the industries of the
 * exhibitions the buyer has registered for (cancelled and rejected ones left out). `profileTexts` holds what the profile
 * says about their business, most telling first (business field, then what they want to buy).
 */
export function suggestionFor(industry: string, history: string[], profileTexts: string[]): Suggestion | null {
  const own = norm(industry);
  if (!own) return null;
  if (history.some((h) => norm(h) === own)) return { reason: "history" };
  const words = industryWords(industry);
  if (words.size === 0) return null;
  for (const text of profileTexts) {
    if (!text.trim()) continue;
    const theirs = industryWords(text);
    for (const w of words) if (theirs.has(w)) return { reason: "profile", field: text.trim().slice(0, 80) };
  }
  return null;
}
