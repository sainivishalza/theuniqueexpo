import { NextResponse } from "next/server";

// In-memory, per-process fixed-window rate limiter. Good enough for a
// single Node server (see AGENTS.md: no separate backend service for the
// MVP) -- if this ever runs across multiple instances, swap the Map for a
// shared store (e.g. Redis) instead of adding more limiters like this one.
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

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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

// Called after a successful attempt so a legitimate user who mistyped
// their password a few times isn't left counting down a stale window.
export function resetRateLimit(key: string): void {
  buckets.delete(key);
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
export function rateLimitOrNull(request: Request, keyPrefix: string, limit: number, windowMs: number): NextResponse | null {
  const key = `${keyPrefix}:${getClientIp(request)}`;
  const { allowed, retryAfterSeconds } = checkRateLimit(key, limit, windowMs);
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
export function checkLoginRateLimit(request: Request, email?: string): RateLimitResult {
  const byIp = checkRateLimit(`login:${getClientIp(request)}`, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS);
  if (!byIp.allowed || !email) return byIp;
  const byAccount = checkRateLimit(
    `login-account:${email.trim().toLowerCase()}`,
    LOGIN_ACCOUNT_ATTEMPT_LIMIT,
    LOGIN_ACCOUNT_ATTEMPT_WINDOW_MS
  );
  return byAccount.allowed ? byIp : byAccount;
}

export function resetLoginRateLimit(request: Request, email?: string): void {
  resetRateLimit(`login:${getClientIp(request)}`);
  if (email) resetRateLimit(`login-account:${email.trim().toLowerCase()}`);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (ips.length > 0) return ips[ips.length - 1];
  }
  return request.headers.get("x-real-ip") || "unknown";
}
