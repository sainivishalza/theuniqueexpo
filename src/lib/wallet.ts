// Rewards wallet: rules and checks shared by the screens and the server.
//
// 1 reward point = 1 RMB, always a whole number. Nothing here touches the
// database, so it is safe to import from browser code too.

export const MAX_POINTS = 10_000_000; // one operation never moves more than this

// Giving the same points to many buyers at once: caps that stop a slip of the finger.
export const BULK_MAX_POINTS = 100_000; // per buyer
export const BULK_MAX_BUYERS = 500;

export const DEFAULT_WALLET_SETTINGS = {
  transferMax: 50_000, // points in one transfer
  transferDailyMax: 100_000, // points a buyer can send in 24 hours
  withdrawMin: 100,
  transfersEnabled: true,
  withdrawalsEnabled: true,
};

export type WalletTxType =
  | "attendance"
  | "expense"
  | "topup"
  | "transfer_in"
  | "transfer_out"
  | "withdrawal_hold"
  | "withdrawal_refund"
  | "purchase"
  | "purchase_refund"
  | "adjustment";

export type WithdrawalMethod = "alipay" | "wechat" | "bank";
export const WITHDRAWAL_METHODS: WithdrawalMethod[] = ["alipay", "wechat", "bank"];

export const EXPENSE_CATEGORIES = ["flight", "train", "hotel", "taxi", "meals", "visa", "other"] as const;

// Everything that can go wrong, as a short code. The server sends the code; each
// screen shows it in the visitor's language.
export type WalletErrorCode =
  | "invalid_amount"
  | "invalid_input"
  | "insufficient_funds"
  | "frozen"
  | "not_buyer"
  | "not_found"
  | "recipient_not_found"
  | "self_transfer"
  | "over_limit"
  | "over_daily_limit"
  | "below_minimum"
  | "transfers_disabled"
  | "withdrawals_disabled"
  | "already_processed"
  | "key_conflict"
  | "tour_not_for_points"
  | "already_purchased"
  | "wrong_password"
  | "rate_limited"
  | "unauthorized";

// A whole number of points, 1..MAX_POINTS. Anything else -- text, fractions, zero,
// negatives, NaN, absurdly large -- is refused (returns null).
export function parsePoints(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) return null;
  return value >= 1 && value <= MAX_POINTS ? value : null;
}

// A signed amount for an admin adjustment: whole, not zero.
export function parseSignedPoints(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value === 0) return null;
  return Math.abs(value) <= MAX_POINTS ? value : null;
}

// A random token the screen makes once per attempt. Sending the same token twice
// (a double click, a retry after a bad connection) is treated as one request.
export function isValidClientKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value);
}

export function newClientKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// "Li Wei" -> "L*** W**": enough for the sender to recognise the person they are about
// to pay, not enough to read their name off a scanned code.
export function maskName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const chars = Array.from(part);
      return chars[0] + "*".repeat(Math.min(chars.length - 1, 4));
    })
    .join(" ");
}

export function maskAccount(account: string): string {
  const digits = account.replace(/\s+/g, "");
  return digits.length <= 4 ? digits : `•••• ${digits.slice(-4)}`;
}

export interface WithdrawalInput {
  points: number;
  method: WithdrawalMethod;
  qrImage: string;
  accountName: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  note: string;
}

// What a buyer must give for each way of being paid. `isImage` tells whether a value
// is an acceptable uploaded picture (the server and the browser each pass their own).
export function validateWithdrawalDetails(
  input: Omit<WithdrawalInput, "points">,
  isImage: (value: string) => boolean
): WalletErrorCode | null {
  if (!WITHDRAWAL_METHODS.includes(input.method)) return "invalid_input";
  if (input.accountName.length > 150 || input.bankName.length > 150 || input.bankBranch.length > 200 || input.note.length > 500) {
    return "invalid_input";
  }
  if (input.method === "bank") {
    if (!input.accountName.trim() || !input.bankName.trim()) return "invalid_input";
    if (!/^[0-9 ]{6,30}$/.test(input.bankAccount) || input.bankAccount.replace(/\s/g, "").length < 6) return "invalid_input";
    return null;
  }
  // Alipay and WeChat are paid by scanning the buyer's own QR code.
  return input.qrImage && isImage(input.qrImage) ? null : "invalid_input";
}
