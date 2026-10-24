// Train-ticket refunds: rules and helpers shared by the screens and the server. Nothing here touches the database.
//
// A buyer who bought their own train ticket sends the scan receipt from the station and the e-invoice downloaded from
// 12306; an admin checks the amount on the invoice and approves or rejects. What an approval pays is the amount times
// the exhibition's refund share, never more than the exhibition's limit (1 point = 1 RMB).

export type RefundMode = "none" | "refund";

export interface RefundRules {
  mode: RefundMode;
  percent: number; // 1..100
  maxPoints: number; // 0 = no limit
}

export const REFUND_MAX_AMOUNT = 100_000; // RMB on one invoice
export const REFUND_MAX_POINTS = 1_000_000;

export const DEFAULT_REFUND_RULES: RefundRules = { mode: "none", percent: 100, maxPoints: 0 };

export function parseRefundRules(body: unknown): RefundRules | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (b.mode !== "none" && b.mode !== "refund") return null;
  const percent = b.percent;
  const maxPoints = b.maxPoints;
  if (typeof percent !== "number" || !Number.isSafeInteger(percent) || percent < 1 || percent > 100) return null;
  if (typeof maxPoints !== "number" || !Number.isSafeInteger(maxPoints) || maxPoints < 0 || maxPoints > REFUND_MAX_POINTS) return null;
  return { mode: b.mode, percent, maxPoints };
}

// "536", "536.00", "¥536.00", "RMB 536,50", "￥ 1 536.5" -> 536 / 536 / 536 / 536.5 / 1536.5; anything else -> null. At most two decimals.
export function parseCny(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const cleaned = text.replace(/[¥￥]|RMB|CNY|元/gi, "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 && n <= REFUND_MAX_AMOUNT ? Math.round(n * 100) / 100 : null;
}

// Points an invoice of `amount` RMB is worth under the rules, after the points this buyer already got back for the same
// exhibition. Whole points, rounded down; 0 when the limit is used up or the exhibition does not refund.
export function refundPoints(amount: number, rules: RefundRules, alreadyRefunded = 0): number {
  if (rules.mode !== "refund") return 0;
  const share = Math.floor((amount * rules.percent) / 100);
  const left = rules.maxPoints > 0 ? Math.max(0, rules.maxPoints - alreadyRefunded) : Infinity;
  return Math.max(0, Math.min(share, left));
}

// What 12306 asks for after the QR code: the last 6 characters of the passport number the ticket was bought with.
export function passportLast6(passport: string | null | undefined): string {
  const compact = (passport ?? "").replace(/[\s-]/g, "").toUpperCase();
  return compact.length >= 6 ? compact.slice(-6) : "";
}

// The address in a QR code, when it is a web link (the only kind a phone can open for you).
export function qrLink(text: string): string | null {
  return /^https?:\/\/\S+$/i.test(text.trim()) ? text.trim() : null;
}

// The e-ticket number printed on the invoice: letters and digits only. "" when it was left empty; null when it is not valid.
export function parseTicketNo(text: unknown): string | null {
  if (text === undefined || text === null || text === "") return "";
  if (typeof text !== "string") return null;
  const compact = text.replace(/\s/g, "").toUpperCase();
  if (compact === "") return "";
  return /^[A-Z0-9]{8,40}$/.test(compact) ? compact : null;
}
