import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// Fixed-window request limiter. The counters live in the rate_limits table, so a restart of the
// server (or a second server process) does not give anyone a fresh start. If the table cannot be
// used (a deploy that has not created it yet, a database hiccup) the limiter falls back to the
// per-process memory below for a short while rather than failing the request.
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

// Bounds memory from buckets that are never explicitly reset (only a
// *successful* login resets its key -- failed/abandoned attempts from
// distinct IPs would otherwise accumulate forever). Only swept when the
// map has actually grown large, so the common case pays nothing extra.
const MAX_BUCKETS_BEFORE_SWEEP = 5000;

function sweepExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// ----- per-process memory (the fallback, and for limits that are too frequent to store) -----

export function checkRateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (!bucket && buckets.size >= MAX_BUCKETS_BEFORE_SWEEP) sweepExpiredBuckets(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function peekMemory(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now || bucket.count < limit) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
}

// ----- the rate_limits table -----

// After a database error the table is not tried again for this long.
const DB_RETRY_AFTER_MS = 30_000;
let dbDownUntil = 0;
let callsSinceCleanup = 0;

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

function dbUsable(): boolean {
  return Date.now() >= dbDownUntil;
}

function dbFailed(err: unknown): void {
  dbDownUntil = Date.now() + DB_RETRY_AFTER_MS;
  console.error("rate_limits table unavailable, using memory:", (err as { code?: string })?.code ?? err);
}

// Old windows are removed now and then (every few hundred checks), so the table stays small.
function maybeCleanup(): void {
  callsSinceCleanup += 1;
  if (callsSinceCleanup < 300) return;
  callsSinceCleanup = 0;
  pool.query("DELETE FROM rate_limits WHERE reset_at < ?", [Date.now() - 60_000]).catch(() => {});
}

// Counts one attempt. The window starts at the first attempt and is not extended by later ones.
// The count column is assigned before reset_at, so it still sees the window's old end. LAST_INSERT_ID(x)
// hands this statement's own count back in the reply (insertId), so two requests arriving at the same
// moment each get their own number and the limit is exact.
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (!dbUsable()) return checkRateLimitMemory(key, limit, windowMs);
  const now = Date.now();
  const id = hashKey(key);
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO rate_limits (key_hash, hits, reset_at) VALUES (?, LAST_INSERT_ID(1), ?)
       ON DUPLICATE KEY UPDATE hits = LAST_INSERT_ID(IF(reset_at <= ?, 1, hits + 1)), reset_at = IF(reset_at <= ?, ?, reset_at)`,
      [id, now + windowMs, now, now, now + windowMs]
    );
    maybeCleanup();
    const hits = Number(result.insertId);
    if (hits <= limit) return { allowed: true, retryAfterSeconds: 0 };
    const [rows] = await pool.query<RowDataPacket[]>("SELECT reset_at FROM rate_limits WHERE key_hash = ?", [id]);
    const resetAt = Number(rows[0]?.reset_at ?? now + windowMs);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
  } catch (err) {
    dbFailed(err);
    return checkRateLimitMemory(key, limit, windowMs);
  }
}

// Looks at a bucket without counting an attempt: "is this key already over its limit?"
// For checks where only the failures should count (a wrong password), not every try.
export async function peekRateLimit(key: string, limit: number): Promise<RateLimitResult> {
  if (!dbUsable()) return peekMemory(key, limit);
  const now = Date.now();
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT hits, reset_at FROM rate_limits WHERE key_hash = ?", [hashKey(key)]);
    const row = rows[0];
    if (!row || Number(row.reset_at) <= now || Number(row.hits) < limit) return { allowed: true, retryAfterSeconds: 0 };
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((Number(row.reset_at) - now) / 1000)) };
  } catch (err) {
    dbFailed(err);
    return peekMemory(key, limit);
  }
}

// Called after a successful attempt so a legitimate user who mistyped
// their password a few times isn't left counting down a stale window.
export async function resetRateLimit(key: string): Promise<void> {
  buckets.delete(key);
  if (!dbUsable()) return;
  try {
    await pool.query("DELETE FROM rate_limits WHERE key_hash = ?", [hashKey(key)]);
  } catch (err) {
    dbFailed(err);
  }
}

// X-Forwarded-For is append-only across hops (each proxy adds the address
// it saw the request come from), so the *first* entry is whatever the
// client itself sent -- trivially spoofable, and always wrong to key a
// rate limiter on. The *last* entry is the one added by the hop directly
// in front of this app, which a remote client can't forge as long as
// that hop overwrites/appends rather than passing the header through
// untouched. Falls back to X-Real-IP (set outright by some proxies).
// Shared helper for the common "no-login-required" public form/endpoint
// case (register, RFQ posting, consultation/moving-quote/visa/tour lead
// forms, etc.) -- these have no session to key on, so IP is the only
// signal available. Returns a ready-to-return 429 response, or null if
// the request is within the limit.
export async function rateLimitOrNull(
  request: Request,
  keyPrefix: string,
  limit: number,
  windowMs: number,
  options: { memoryOnly?: boolean } = {}
): Promise<NextResponse | null> {
  const key = `${keyPrefix}:${getClientIp(request)}`;
  const { allowed, retryAfterSeconds } = options.memoryOnly ? checkRateLimitMemory(key, limit, windowMs) : await checkRateLimit(key, limit, windowMs);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }
  return null;
}

const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

// A distributed attacker (many IPs, one target account) would sail through
// a per-IP-only limit -- this second, per-account bucket is intentionally
// a bit looser than the per-IP one (a shared office/NAT legitimately fails
// a password more often from one IP than one specific account should ever
// need to across everyone hitting it).
const LOGIN_ACCOUNT_ATTEMPT_LIMIT = 20;
const LOGIN_ACCOUNT_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

// Shared by every code path that checks a password against the DB --
// /api/auth/login, and the inline sign-in branch of expo/tour registration
// (which also creates a session for an existing account by verifying its
// password). All draw from the same per-IP (and, when an email is known,
// per-account) buckets so brute-forcing one account can't bypass the limit
// just by hitting a different endpoint or spreading requests across IPs.
export async function checkLoginRateLimit(request: Request, email?: string): Promise<RateLimitResult> {
  const byIp = await checkRateLimit(`login:${getClientIp(request)}`, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS);
  if (!byIp.allowed || !email) return byIp;
  const byAccount = await checkRateLimit(
    `login-account:${email.trim().toLowerCase()}`,
    LOGIN_ACCOUNT_ATTEMPT_LIMIT,
    LOGIN_ACCOUNT_ATTEMPT_WINDOW_MS
  );
  return byAccount.allowed ? byIp : byAccount;
}

export async function resetLoginRateLimit(request: Request, email?: string): Promise<void> {
  await resetRateLimit(`login:${getClientIp(request)}`);
  if (email) await resetRateLimit(`login-account:${email.trim().toLowerCase()}`);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (ips.length > 0) return ips[ips.length - 1];
  }
  return request.headers.get("x-real-ip") || "unknown";
}
