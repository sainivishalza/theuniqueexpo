// Browser helpers for the wallet screens.

export interface WalletResponse<T> {
  ok: boolean;
  status: number;
  data: T & { code?: string; error?: string };
}

// Calls a wallet API and never throws: a lost connection comes back as
// { ok: false, status: 0, data: { code: "network" } } so a screen only has one
// failure path to handle.
export async function walletApi<T = Record<string, unknown>>(path: string, init?: { method?: string; body?: unknown }): Promise<WalletResponse<T>> {
  try {
    const res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as WalletResponse<T>["data"];
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { code: "network" } as WalletResponse<T>["data"] };
  }
}

const KNOWN_CODES = new Set([
  "invalid_amount", "invalid_input", "insufficient_funds", "frozen", "not_buyer", "not_found", "recipient_not_found", "self_transfer",
  "over_limit", "over_daily_limit", "below_minimum", "transfers_disabled", "withdrawals_disabled", "already_processed", "key_conflict",
  "tour_not_for_points", "already_purchased", "wrong_password", "rate_limited", "unauthorized", "duplicate_ticket", "invoice_missing", "refund_not_available", "network",
]);

// The translation key (under `errors.`) for a failed call.
export function errorKey(code: string | undefined): string {
  return code && KNOWN_CODES.has(code) ? code : "generic";
}

// "12" / "  12 " -> 12; anything that is not a whole positive number -> null.
export function pointsFromText(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,8}$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= 1 ? n : null;
}

// What a buyer scanned or pasted -> the wallet code inside it, if any. The QR code holds
// a link ending in ?to=<code>; a bare code is accepted too.
export function walletCodeFromText(text: string): string | null {
  const value = text.trim();
  try {
    const code = new URL(value).searchParams.get("to");
    if (code && /^[A-Za-z0-9_-]{24}$/.test(code)) return code;
  } catch {
    // not a link
  }
  return /^[A-Za-z0-9_-]{24}$/.test(value) ? value : null;
}

// Fetches a file from an admin export and hands it to the browser as a download. Never throws:
// { ok: false } with the error code when it did not work.
export async function downloadWalletFile(path: string, fallbackName: string): Promise<{ ok: boolean; code?: string }> {
  try {
    const res = await fetch(path);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { code?: string };
      return { ok: false, code: data.code };
    }
    const named = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "");
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = named?.[1] ?? fallbackName;
    link.click();
    URL.revokeObjectURL(link.href);
    return { ok: true };
  } catch {
    return { ok: false, code: "network" };
  }
}
