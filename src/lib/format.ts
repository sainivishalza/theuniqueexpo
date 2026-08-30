// Simple number formatting that works consistently on server and client.
// toLocaleString() produces different output on server vs client depending
// on the runtime locale, which causes React hydration mismatches.

export function formatNumber(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatCurrency(n: number): string {
  return "$" + formatNumber(n);
}
