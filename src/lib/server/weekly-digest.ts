import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/login-id";
import { isMailEnabled, sendMail } from "@/lib/server/mail";
import { listExhibitions } from "@/lib/server/exhibitions-repo";
import { asLocale, renderDigestEmail, SITE_URL, type DigestItem, type EmailLocale } from "@/lib/server/notifications";

// The weekly "new exhibitions" e-mail to buyers who have not turned it off. It is off until an admin switches it on
// (Admin -> Email). A "batch" is one week: the exhibitions added since the previous batch began, sent to a hundred or so
// buyers each time the daily job runs (every hour or so), so a big list never floods the mail server. Each buyer is
// marked before their e-mail goes out, so nobody gets it twice.

const BATCH_DAYS = 7;
const PER_RUN = 100;
const MAX_ITEMS = 8;

export interface DigestStatus {
  enabled: boolean;
  lastBatchAt: string | null;
  lastCount: number;
}

/** null until migration 085 has run. */
export async function getDigestStatus(): Promise<DigestStatus | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT enabled, DATE_FORMAT(batch_at, '%Y-%m-%d %H:%i:%s') AS batch_at, last_count FROM digest_settings WHERE id = 1");
    if (!rows[0]) return { enabled: false, lastBatchAt: null, lastCount: 0 };
    return { enabled: !!rows[0].enabled, lastBatchAt: rows[0].batch_at ? String(rows[0].batch_at) : null, lastCount: Number(rows[0].last_count) || 0 };
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return null;
    throw err;
  }
}

export async function saveDigestEnabled(enabled: boolean, adminId: number): Promise<boolean> {
  try {
    await pool.query("INSERT INTO digest_settings (id, enabled, updated_by) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_by = VALUES(updated_by)", [enabled ? 1 : 0, adminId]);
    return true;
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return false;
    throw err;
  }
}

/** The exhibitions the digest is about, in each language: still to come, newest first, a few only. */
async function digestItems(ids: number[], locale: EmailLocale): Promise<DigestItem[]> {
  const wanted = new Set(ids.map(String));
  const all = await listExhibitions(locale);
  return all
    .filter((e) => wanted.has(e.id))
    .slice(0, MAX_ITEMS)
    .map((e) => ({ title: e.title, dates: e.dates, city: e.city, url: `${SITE_URL}/${locale}/exhibitions/${e.slug}` }));
}

/** What the next digest would list (for the admin's preview): exhibitions added in the last week that have not ended. */
export async function recentExhibitionIds(sinceDays = BATCH_DAYS): Promise<number[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM exhibitions WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY) AND end_date >= UTC_DATE() ORDER BY created_at DESC LIMIT ?",
    [sinceDays, MAX_ITEMS]
  );
  return rows.map((r) => Number(r.id));
}

/** Sends the digest to one person right now, whatever their settings (the admin's own preview). */
export async function sendDigestPreview(user: { id: number; name: string; email: string; locale: EmailLocale }): Promise<"sent" | "nothing_new" | "failed"> {
  const ids = await recentExhibitionIds();
  const items = await digestItems(ids, user.locale);
  if (items.length === 0) return "nothing_new";
  const mail = await renderDigestEmail(user.locale, user.name, items, user.id);
  const result = await sendMail({ to: user.email, kind: "digest", userId: user.id, ...mail });
  return result.ok ? "sent" : "failed";
}

/** Part of the daily job: starts a new week's batch when it is time, and sends the next hundred. Returns how many went out. */
export async function runWeeklyDigest(): Promise<number> {
  if (!(await isMailEnabled())) return 0;
  const status = await getDigestStatus().catch(() => null);
  if (!status?.enabled) return 0;

  // A new batch starts when the last one is a week old; the update decides which run starts it.
  await pool.query(
    `UPDATE digest_settings SET since_at = COALESCE(batch_at, DATE_SUB(NOW(), INTERVAL ${BATCH_DAYS} DAY)), batch_at = NOW(), last_count = 0
     WHERE id = 1 AND enabled = 1 AND (batch_at IS NULL OR batch_at < DATE_SUB(NOW(), INTERVAL ${BATCH_DAYS} DAY))`
  );
  const [settings] = await pool.query<RowDataPacket[]>("SELECT since_at, batch_at FROM digest_settings WHERE id = 1");
  const sinceAt = settings[0]?.since_at, batchAt = settings[0]?.batch_at;
  if (!sinceAt || !batchAt) return 0;

  // What was added since the previous batch (and has not ended).
  const [added] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM exhibitions WHERE created_at > ? AND created_at <= ? AND end_date >= UTC_DATE() ORDER BY created_at DESC LIMIT ?",
    [sinceAt, batchAt, MAX_ITEMS]
  );
  if (added.length === 0) return 0;
  const ids = added.map((r) => Number(r.id));

  const [people] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, email, preferred_locale FROM users
     WHERE role = 'buyer' AND status <> 'suspended' AND mail_digest = 1 AND (digest_sent_at IS NULL OR digest_sent_at < ?)
     ORDER BY id LIMIT ${PER_RUN}`,
    [batchAt]
  );
  const itemsByLocale = new Map<EmailLocale, DigestItem[]>();
  let sent = 0;
  for (const p of people) {
    const email = String(p.email || "");
    // Claimed first, so a second run (or a second server) never sends the same person the same week's e-mail again.
    const [claim] = await pool.query<ResultSetHeader>("UPDATE users SET digest_sent_at = NOW() WHERE id = ? AND (digest_sent_at IS NULL OR digest_sent_at < ?)", [p.id, batchAt]);
    if (claim.affectedRows !== 1 || !email || isPlaceholderEmail(email)) continue;
    const locale = asLocale(p.preferred_locale);
    let items = itemsByLocale.get(locale);
    if (!items) {
      items = await digestItems(ids, locale);
      itemsByLocale.set(locale, items);
    }
    if (items.length === 0) continue;
    const mail = await renderDigestEmail(locale, String(p.name || ""), items, Number(p.id));
    const result = await sendMail({ to: email, kind: "digest", userId: Number(p.id), ...mail });
    if (result.ok) sent += 1;
  }
  if (sent > 0) await pool.query("UPDATE digest_settings SET last_count = last_count + ? WHERE id = 1", [sent]);
  return sent;
}
