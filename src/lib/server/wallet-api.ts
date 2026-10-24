import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getSessionUser, requireAdmin, type SessionUser } from "@/lib/auth-server";
import { checkRateLimit, peekRateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { WalletError } from "@/lib/server/wallet-repo";
import type { WalletErrorCode } from "@/lib/wallet";

// Small helpers every wallet API route shares, so each one reads the same way:
// who is asking, how many times they may ask, did they type their password, and how
// a failure is reported.

const MESSAGES: Record<WalletErrorCode, string> = {
  invalid_amount: "Enter a whole number of points.",
  invalid_input: "Some details are missing or not valid.",
  insufficient_funds: "Not enough points.",
  frozen: "This wallet is frozen. Please contact us.",
  not_buyer: "Only buyer accounts have a wallet.",
  not_found: "Not found.",
  recipient_not_found: "We could not find that buyer.",
  self_transfer: "You cannot send points to yourself.",
  over_limit: "That is more than the limit for one transfer.",
  over_daily_limit: "That would go over today's sending limit.",
  below_minimum: "That is below the minimum.",
  transfers_disabled: "Transfers are switched off for now.",
  withdrawals_disabled: "Withdrawals are switched off for now.",
  already_processed: "This has already been handled.",
  key_conflict: "This request was already used for something else. Please try again.",
  tour_not_for_points: "This package cannot be bought with points.",
  already_purchased: "You have already bought this package.",
  wrong_password: "The password is not correct.",
  rate_limited: "Too many attempts. Please wait a little and try again.",
  duplicate_ticket: "This ticket has already been sent for a refund.",
  refund_not_available: "Tickets for this exhibition are not refunded in points.",
  unauthorized: "Please sign in.",
};

export function walletFail(code: WalletErrorCode, status?: number, headers?: Record<string, string>): NextResponse {
  const defaults: Partial<Record<WalletErrorCode, number>> = { unauthorized: 401, not_buyer: 403, rate_limited: 429, duplicate_ticket: 409, refund_not_available: 403, wrong_password: 403, not_found: 404, recipient_not_found: 404 };
  return NextResponse.json({ error: MESSAGES[code], code }, { status: status ?? defaults[code] ?? 400, headers });
}

// Turns anything thrown by the wallet code into a response. Only WalletError carries a
// code the screens understand; anything else is logged and shown as a plain failure.
export function walletErrorResponse(err: unknown): NextResponse {
  if (err instanceof WalletError) return walletFail(err.code, err.status);
  console.error("Wallet error:", err);
  return NextResponse.json({ error: "Something went wrong. Please try again.", code: "server_error" }, { status: 500 });
}

export type BuyerResult = { user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse };

// Wallets belong to signed-in buyers; anyone else (visitors, exhibitors, partners and
// admins) is refused.
export async function requireBuyer(request: Request): Promise<BuyerResult> {
  const user = await getSessionUser(request);
  if (!user) return { response: walletFail("unauthorized") };
  if (user.role !== "buyer") return { response: walletFail("not_buyer") };
  return { user };
}

export type AdminResult = { admin: SessionUser; response?: undefined } | { admin?: undefined; response: NextResponse };

export async function requireWalletAdmin(request: Request): Promise<AdminResult> {
  const admin = await requireAdmin(request);
  if (!admin) return { response: NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 }) };
  return { admin };
}

// Per-person limit (not per address): returns a ready 429, or null when allowed.
export async function limitOrNull(userId: number, name: string, limit: number, windowMs: number): Promise<NextResponse | null> {
  const result = await checkRateLimit(`wallet:${name}:${userId}`, limit, windowMs);
  return result.allowed ? null : walletFail("rate_limited", 429, { "Retry-After": String(result.retryAfterSeconds) });
}

const PASSWORD_ATTEMPTS = 6;
const PASSWORD_WINDOW_MS = 10 * 60 * 1000;

// Sending points and withdrawing them ask for the account password again, so a stolen
// or left-open session alone cannot move money. A handful of wrong tries locks the
// check for ten minutes.
export async function checkPassword(userId: number, password: unknown): Promise<NextResponse | null> {
  const key = `wallet-password:${userId}`;
  const blocked = await peekRateLimit(key, PASSWORD_ATTEMPTS);
  if (!blocked.allowed) return walletFail("rate_limited", 429, { "Retry-After": String(blocked.retryAfterSeconds) });
  // Only wrong passwords count towards the limit.
  const wrong = async () => {
    await checkRateLimit(key, PASSWORD_ATTEMPTS, PASSWORD_WINDOW_MS);
    return walletFail("wrong_password");
  };
  if (typeof password !== "string" || password === "" || password.length > 200) return await wrong();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT password_hash FROM users WHERE id = ?", [userId]);
  const hash = rows[0]?.password_hash as string | undefined;
  if (!hash || !(await bcrypt.compare(password, hash))) return await wrong();
  await resetRateLimit(key);
  return null;
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function positiveId(value: string): number | null {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// Pictures uploaded for the wallet (payment QR codes, proofs): a real image upload,
// not a link, within a size limit.
export const MAX_WALLET_IMAGE_BYTES = 5 * 1024 * 1024;
