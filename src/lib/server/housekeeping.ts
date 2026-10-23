import pool from "@/lib/db";
import { checkRateLimit } from "@/lib/server/rate-limit";

// Old records that nobody needs any more are removed once a day, so the tables stay small and the
// database does not keep personal details (e-mail addresses, IP addresses) longer than it has to.
//   e-mail log          180 days     (who was e-mailed what, to answer "did my mail go out?")
//   admin activity log  2 years
//   used / expired links  1 day after they stop working (password reset, change of e-mail)
// Started by the admin home and by the daily reminder call; never delays or fails either.

export const EMAIL_LOG_DAYS = 180;
export const ACTIVITY_LOG_DAYS = 730;

const STATEMENTS = [
  `DELETE FROM email_log WHERE created_at < DATE_SUB(NOW(), INTERVAL ${EMAIL_LOG_DAYS} DAY)`,
  `DELETE FROM admin_audit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL ${ACTIVITY_LOG_DAYS} DAY)`,
  "DELETE FROM password_resets WHERE expires_at < (UNIX_TIMESTAMP() - 86400) * 1000",
  "DELETE FROM email_changes WHERE expires_at < (UNIX_TIMESTAMP() - 86400) * 1000",
];

/** Removes the old records now. Returns how many rows went; a table a deploy has not created yet counts as nothing. */
export async function pruneOldRecords(): Promise<number> {
  let removed = 0;
  for (const sql of STATEMENTS) {
    try {
      const [res] = await pool.query<import("mysql2/promise").ResultSetHeader>(sql);
      removed += res.affectedRows;
    } catch (err) {
      if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") throw err;
    }
  }
  return removed;
}

export function runHousekeepingInBackground(): void {
  // One run per day across all servers and callers: the first caller of the day gets the only "allowed".
  checkRateLimit("housekeeping-daily", 1, 24 * 60 * 60_000)
    .then((turn) => (turn.allowed ? pruneOldRecords() : 0))
    .catch((err) => console.error("Housekeeping failed:", err));
}
