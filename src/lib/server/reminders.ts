import { randomBytes, timingSafeEqual } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { decryptSecret, encryptSecret, isMailEnabled } from "@/lib/server/mail";
import { notifyUser } from "@/lib/server/notifications";
import { sendDocumentExpiryAlerts, sendSavedExhibitionAlerts } from "@/lib/server/registration-alerts";
import { exhibitionsWithWaitlist, promoteFromWaitlist } from "@/lib/server/waitlist";

// "Please confirm your attendance": an approved registration whose confirm-by date is within 2 days and
// that the buyer has not confirmed yet gets one reminder e-mail. The job runs at most every 6 hours, started
// either by an admin opening the admin home (no setup needed) or by a scheduled caller with the reminder key
// (the nightly GitHub workflow), so it also runs when nobody opens the admin.

const MIN_HOURS_BETWEEN_RUNS = 6;
const DAYS_AHEAD = 2;
// "Starts soon": a confirmed registration is reminded once in the week before the exhibition opens.
const START_DAYS_AHEAD = 7;
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
  /** "Please confirm your attendance" e-mails. */
  sent: number;
  /** "Your exhibition starts soon" e-mails. */
  startSent?: number;
  /** Alerts to people who saved an exhibition ("registration opened", "closes soon"). */
  savedSent?: number;
  /** "Your passport / visa expires too early" alerts. */
  documentSent?: number;
}

// The alerts that do not need e-mail (they are always shown on the website, and e-mailed too when e-mail is on): people
// moved up the waiting list, saved exhibitions whose registration opens or closes, passports and visas that expire too
// early. Each is told once, so running this often is harmless.
export async function runDailyAlerts(): Promise<{ promoted: number; saved: number; documents: number }> {
  let promoted = 0;
  for (const exhibitionId of await exhibitionsWithWaitlist()) promoted += await promoteFromWaitlist(exhibitionId);
  const saved = await sendSavedExhibitionAlerts();
  const documents = await sendDocumentExpiryAlerts();
  return { promoted, saved: saved.opened + saved.closing, documents: documents.passport + documents.visa };
}

let lastAlertsRun = 0;
function runAlertsInBackground(): void {
  // At most once an hour per server process; the alerts themselves are told once whatever happens here.
  if (Date.now() - lastAlertsRun < 60 * 60_000) return;
  lastAlertsRun = Date.now();
  runDailyAlerts().catch((err) => console.error("Daily alerts failed:", err));
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
  const startSent = await sendStartReminders();
  const alerts = await runDailyAlerts().catch((err) => {
    console.error("Daily alerts failed:", err);
    return { promoted: 0, saved: 0, documents: 0 };
  });
  return { ran: true, sent, startSent, savedSent: alerts.saved, documentSent: alerts.documents };
}

// Confirmed registrations whose exhibition opens within the week, not yet checked in and not yet reminded.
async function sendStartReminders(): Promise<number> {
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.user_id, e.title, e.slug, e.start_date
       FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
       WHERE r.status = 'confirmed' AND r.checked_in_at IS NULL AND r.start_reminder_sent_at IS NULL
         AND e.start_date >= UTC_DATE() AND e.start_date <= DATE_ADD(UTC_DATE(), INTERVAL ${START_DAYS_AHEAD} DAY)
       ORDER BY e.start_date LIMIT ${MAX_PER_RUN}`
    );
  } catch (err) {
    // The column does not exist until migration 066 has run: nothing to send yet.
    if ((err as { code?: string }).code === "ER_BAD_FIELD_ERROR") return 0;
    throw err;
  }
  let sent = 0;
  for (const r of rows) {
    const [mark] = await pool.query<ResultSetHeader>("UPDATE expo_registrations SET start_reminder_sent_at = NOW() WHERE id = ? AND start_reminder_sent_at IS NULL", [r.id]);
    if (mark.affectedRows !== 1) continue;
    const date = r.start_date instanceof Date ? r.start_date.toISOString().slice(0, 10) : String(r.start_date).slice(0, 10);
    notifyUser(r.user_id, "registrationStartsSoon", { expo: String(r.title), date }, { path: `/exhibitions/${String(r.slug)}` });
    sent += 1;
  }
  return sent;
}

// Started in the background by the admin home; never delays or fails the page.
export function runRemindersInBackground(): void {
  runAlertsInBackground();
  runRegistrationReminders().catch((err) => console.error("Reminder run failed:", err));
}
