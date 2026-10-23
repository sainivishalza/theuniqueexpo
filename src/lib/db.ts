import mysql from "mysql2/promise";
import fs from "fs";
import { createHash } from "node:crypto";

// DB_SOCKET connects over a Unix socket instead of TCP -- needed in build
// sandboxes (like Hostinger's hbuilds) that are network-isolated from the
// DB server but still share its filesystem. That env var is set globally
// (build and runtime share the same config), but the *runtime* serving
// process runs in a different, non-isolated sandbox where that socket
// file doesn't exist -- so check it actually exists before trusting it,
// and fall back to a normal TCP connection otherwise.
const socketExists =
  !!process.env.DB_SOCKET && fs.existsSync(process.env.DB_SOCKET);

const pool = mysql.createPool({
  ...(socketExists
    ? { socketPath: process.env.DB_SOCKET }
    : { host: process.env.DB_HOST || "localhost" }),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "theuniqueexpo",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  charset: process.env.DB_CHARSET || "utf8mb4",
});

// Database queries that take unusually long (SLOW_QUERY_MS, default 400 ms) are counted by what they look like, with the numbers
// and texts in them taken out, and written to the slow_queries table about once a minute (Admin -> Slow queries). This adds a clock
// reading to each query and nothing else; a failure while recording is ignored.
const SLOW_MS = Number(process.env.SLOW_QUERY_MS) > 0 ? Number(process.env.SLOW_QUERY_MS) : 400;
const FLUSH_MS = Number(process.env.SLOW_QUERY_FLUSH_MS) > 0 ? Number(process.env.SLOW_QUERY_FLUSH_MS) : 60_000;
interface SlowEntry { sql: string; calls: number; totalMs: number; maxMs: number; lastMs: number }
const slowSeen = new Map<string, SlowEntry>();
let slowTableMissingUntil = 0;

export function slowQueryShape(sql: string): string {
  return sql
    .replace(/\s+/g, " ")
    .replace(/'(?:[^'\\]|\\.)*'/g, "?")
    .replace(/\b\d+(?:\.\d+)?\b/g, "?")
    .replace(/\((?:\s*\?\s*,)+\s*\?\s*\)/g, "(?)")
    .trim()
    .slice(0, 600);
}

const rawQuery = pool.query.bind(pool) as (...args: unknown[]) => Promise<unknown>;

async function flushSlowQueries(): Promise<void> {
  if (slowSeen.size === 0 || Date.now() < slowTableMissingUntil) return;
  const batch = [...slowSeen.entries()];
  slowSeen.clear();
  for (const [fingerprint, e] of batch) {
    try {
      await rawQuery(
        `INSERT INTO slow_queries (fingerprint, sql_text, calls, total_ms, max_ms, last_ms, first_at, last_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE calls = calls + VALUES(calls), total_ms = total_ms + VALUES(total_ms), max_ms = GREATEST(max_ms, VALUES(max_ms)), last_ms = VALUES(last_ms), last_at = UTC_TIMESTAMP()`,
        [fingerprint, e.sql, e.calls, Math.round(e.totalMs), Math.round(e.maxMs), Math.round(e.lastMs)]
      );
    } catch (err) {
      // The table does not exist until its migration has run: try again in ten minutes.
      if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") slowTableMissingUntil = Date.now() + 10 * 60_000;
      return;
    }
  }
}

function noteSlowQuery(first: unknown, ms: number): void {
  const text = typeof first === "string" ? first : typeof (first as { sql?: unknown })?.sql === "string" ? (first as { sql: string }).sql : "";
  // The recording statements and the housekeeping of this table are not interesting.
  if (!text || /slow_queries/.test(text)) return;
  const shape = slowQueryShape(text);
  const key = createHash("sha1").update(shape).digest("hex");
  const prev = slowSeen.get(key);
  if (prev) {
    prev.calls += 1;
    prev.totalMs += ms;
    prev.maxMs = Math.max(prev.maxMs, ms);
    prev.lastMs = ms;
  } else if (slowSeen.size < 100) {
    slowSeen.set(key, { sql: shape, calls: 1, totalMs: ms, maxMs: ms, lastMs: ms });
  }
}

(pool as unknown as { query: (...args: unknown[]) => unknown }).query = (...args: unknown[]) => {
  const started = performance.now();
  const result = rawQuery(...args);
  const done = () => {
    const ms = performance.now() - started;
    if (ms >= SLOW_MS) noteSlowQuery(args[0], ms);
  };
  result.then(done, done);
  return result;
};

const flushTimer = setInterval(() => void flushSlowQueries(), FLUSH_MS);
flushTimer.unref?.();

export default pool;

// mysql2 throws plain Error objects with a `code` property for driver-level
// errors (see https://github.com/sidorares/node-mysql2#error-handling) --
// there's no typed error class to narrow to, so check the property directly.
export function isDuplicateEntryError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "ER_DUP_ENTRY";
}

export function isForeignKeyConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "ER_ROW_IS_REFERENCED_2";
}
