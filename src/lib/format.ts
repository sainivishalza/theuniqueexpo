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
