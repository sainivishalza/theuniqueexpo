import { randomBytes, timingSafeEqual } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { decryptSecret, encryptSecret, isMailEnabled } from "@/lib/server/mail";
import { notifyUser } from "@/lib/server/notifications";

// "Please confirm your attendance": an approved registration whose confirm-by date is within 2 days and
// that the buyer has not confirmed yet gets one reminder e-mail. The job runs at most every 6 hours, started
// either by an admin opening the admin home (no setup needed) or by a scheduled caller with the reminder key
// (the nightly GitHub workflow), so it also runs when nobody opens the admin.

const MIN_HOURS_BETWEEN_RUNS = 6;
const DAYS_AHEAD = 2;
const MAX_PER_RUN = 200;

export interface ReminderStatus {
  lastRunAt: string | null;
  lastCount: number;
  hasKey: boolean;
}

export async function getReminderStatus(): Promise<ReminderStatus> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT reminder_token_enc, reminders_last_run_at, reminders_last_count FROM mail_settings WHERE id = 1");
    const r = rows[0];
    return { lastRunAt: r?.reminders_last_run_at ? String(r.reminders_last_run_at) : null, lastCount: Number(r?.reminders_last_count ?? 0), hasKey: !!r?.reminder_token_enc };
  } catch {
    return { lastRunAt: null, lastCount: 0, hasKey: false };
  }
}

// Makes (or replaces) the key a scheduled caller uses. Shown to the admin, who puts it in the GitHub secret.
export async function createReminderKey(): Promise<string> {
  const key = randomBytes(24).toString("base64url");
  await pool.query(
    "INSERT INTO mail_settings (id, reminder_token_enc) VALUES (1, ?) ON DUPLICATE KEY UPDATE reminder_token_enc = VALUES(reminder_token_enc)",
    [encryptSecret(key)]
  );
  return key;
}

export async function reminderKeyMatches(candidate: string): Promise<boolean> {
  if (!candidate) return false;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT reminder_token_enc FROM mail_settings WHERE id = 1");
  const stored = rows[0]?.reminder_token_enc ? decryptSecret(String(rows[0].reminder_token_enc)) : null;
  if (!stored) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface ReminderRun {
  ran: boolean;
  sent: number;
}

export async function runRegistrationReminders(options: { force?: boolean } = {}): Promise<ReminderRun> {
  if (!(await isMailEnabled())) return { ran: false, sent: 0 };
  // Only one run at a time, and not more often than every few hours (the update decides who runs).
  const [claim] = await pool.query<ResultSetHeader>(
    `UPDATE mail_settings SET reminders_last_run_at = NOW()
     WHERE id = 1 AND (? = 1 OR reminders_last_run_at IS NULL OR reminders_last_run_at < DATE_SUB(NOW(), INTERVAL ${MIN_HOURS_BETWEEN_RUNS} HOUR))`,
    [options.force ? 1 : 0]
  );
  if (claim.affectedRows !== 1) return { ran: false, sent: 0 };

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.user_id, r.confirm_by, e.title
     FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
     WHERE r.status = 'approved' AND r.confirmed_at IS NULL AND r.reminder_sent_at IS NULL
       AND r.confirm_by IS NOT NULL AND r.confirm_by >= UTC_DATE() AND r.confirm_by <= DATE_ADD(UTC_DATE(), INTERVAL ${DAYS_AHEAD} DAY)
       AND e.end_date >= UTC_DATE()
     ORDER BY r.confirm_by LIMIT ${MAX_PER_RUN}`
  );
  let sent = 0;
  for (const r of rows) {
    // Each registration is claimed before its e-mail goes out, so a second run can never send it again.
    const [mark] = await pool.query<ResultSetHeader>("UPDATE expo_registrations SET reminder_sent_at = NOW() WHERE id = ? AND reminder_sent_at IS NULL", [r.id]);
    if (mark.affectedRows !== 1) continue;
    notifyUser(r.user_id, "registrationReminder", { expo: String(r.title), date: String(r.confirm_by).slice(0, 10) }, { path: "/dashboard/buyer/registrations" });
    sent += 1;
  }
  await pool.query("UPDATE mail_settings SET reminders_last_count = ? WHERE id = 1", [sent]);
  return { ran: true, sent };
}

// Started in the background by the admin home; never delays or fails the page.
export function runRemindersInBackground(): void {
  runRegistrationReminders().catch((err) => console.error("Reminder run failed:", err));
}
