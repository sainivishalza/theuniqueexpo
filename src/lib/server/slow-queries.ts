import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// The database queries the site wrote down as slow (see src/lib/db.ts), worst total time first.
export interface SlowQuery {
  id: number;
  sql: string;
  calls: number;
  totalMs: number;
  avgMs: number;
  maxMs: number;
  lastMs: number;
  firstAt: string;
  lastAt: string;
}

function missing(err: unknown): boolean {
  return (err as { code?: string }).code === "ER_NO_SUCH_TABLE";
}

const iso = (v: unknown) => new Date(String(v).replace(" ", "T") + "Z").toISOString();

export async function listSlowQueries(limit = 30): Promise<SlowQuery[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id, sql_text, calls, total_ms, max_ms, last_ms, first_at, last_at FROM slow_queries ORDER BY total_ms DESC LIMIT ?", [limit]);
    return rows.map((r) => ({
      id: Number(r.id), sql: String(r.sql_text), calls: Number(r.calls), totalMs: Number(r.total_ms), avgMs: Math.round(Number(r.total_ms) / Math.max(1, Number(r.calls))),
      maxMs: Number(r.max_ms), lastMs: Number(r.last_ms), firstAt: iso(r.first_at), lastAt: iso(r.last_at),
    }));
  } catch (err) {
    if (missing(err)) return [];
    throw err;
  }
}

export async function clearSlowQueries(): Promise<void> {
  try {
    await pool.query("DELETE FROM slow_queries");
  } catch (err) {
    if (!missing(err)) throw err;
  }
}

/** Keeps the table small: forgets what was last seen more than 60 days ago. */
export async function pruneSlowQueries(): Promise<number> {
  try {
    const [r] = await pool.query<import("mysql2/promise").ResultSetHeader>("DELETE FROM slow_queries WHERE last_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 DAY)");
    return r.affectedRows;
  } catch (err) {
    if (missing(err)) return 0;
    throw err;
  }
}
