import { normalizePassportNumber } from "@/lib/login-id";

// A pasted list of passport numbers (one per line, or separated by commas, semicolons or tabs). Spaces, dashes and
// capital letters inside a number do not matter ("ar 8800-292" is "AR8800292"). Safe to use in the browser too.

export interface PassportToken {
  raw: string; // as typed, trimmed
  normalized: string; // "" when it cannot be a passport number (fewer than 6 letters/digits, or other characters)
}

export function parsePassportList(text: string): PassportToken[] {
  const seen = new Set<string>();
  const out: PassportToken[] = [];
  for (const part of text.split(/[\n\r,;\t]+/)) {
    const raw = part.trim();
    if (!raw) continue;
    const normalized = normalizePassportNumber(raw);
    // The same number twice is paid once.
    const key = normalized || `invalid:${raw.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ raw, normalized });
  }
  return out;
}
