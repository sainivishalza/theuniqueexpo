// Simple number formatting that works consistently on server and client.
// toLocaleString() produces different output on server vs client depending
// on the runtime locale, which causes React hydration mismatches.

export function formatNumber(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatCurrency(n: number): string {
  return "$" + formatNumber(n);
}

// Catch-block values are `unknown` under strict mode -- these narrow them
// for the common "show the error to the user" case.
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

// First letter of the first and last word, e.g. "Jane Doe" -> "JD",
// "Cher" -> "C" -- used as a placeholder avatar when no photo is set.
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
