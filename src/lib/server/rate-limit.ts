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
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (ips.length > 0) return ips[ips.length - 1];
  }
  return request.headers.get("x-real-ip") || "unknown";
}
