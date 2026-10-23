import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// Data retention for identity documents. A passport page, a visa page and a latest-entry stamp are only needed while
// a buyer is going to an exhibition. Some time after the last exhibition they registered for has ended, they are
// deleted: from the buyer's profile and from the registrations of exhibitions that ended that long ago. Business
// documents (licence, card), the buyer's photo and everything else stay.
//
// A buyer's profile documents are only cleared when ALL of this holds, so nobody loses a file they just uploaded for
// the next exhibition: they registered for at least one exhibition that ended more than `days` ago; they have no
// registration (other than cancelled or rejected) for an exhibition that has not ended or ended within `days`; and their
// profile has not been changed for `days` days.
//
// Off until an admin turns it on. Each run is small (a limited number of buyers) and recorded.

export const RETENTION_DAYS = [30, 60, 90, 180, 365] as const;
const BATCH = 200;
const KEEP_RUNS = 60;

const PROFILE_COLUMNS = ["doc_passport_front", "doc_visa_page", "doc_latest_entry_stamp"] as const;
const REGISTRATION_COLUMNS = ["doc_passport_front", "doc_visa_page"] as const;

export interface RetentionSettings {
  enabled: boolean;
  days: number;
}
export interface RetentionRun {
  id: number;
  runAt: string;
  trigger: "auto" | "manual";
  days: number;
  profilesCleared: number;
  filesRemoved: number;
  registrationsCleared: number;
}
export interface RetentionPreview {
  profiles: number;
  files: number;
  registrations: number;
}

function missing(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR";
}

export function isRetentionDays(value: unknown): value is number {
  return typeof value === "number" && (RETENTION_DAYS as readonly number[]).includes(value);
}

export async function getRetentionSettings(): Promise<RetentionSettings | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT enabled, days FROM data_retention_settings WHERE id = 1");
    return rows[0] ? { enabled: !!rows[0].enabled, days: Number(rows[0].days) } : { enabled: false, days: 90 };
  } catch (err) {
    if (missing(err)) return null;
    throw err;
  }
}

export async function saveRetentionSettings(settings: RetentionSettings, adminId: number): Promise<boolean> {
  try {
    await pool.query(
      "INSERT INTO data_retention_settings (id, enabled, days, updated_by) VALUES (1, ?, ?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), days = VALUES(days), updated_by = VALUES(updated_by)",
      [settings.enabled ? 1 : 0, settings.days, adminId]
    );
    return true;
  } catch (err) {
    if (missing(err)) return false;
    throw err;
  }
}

// The buyers whose profile documents are due for deletion (the rules in the comment at the top).
const DUE_PROFILES_SQL = `
  FROM buyer_profiles p
  WHERE (${PROFILE_COLUMNS.map((c) => `(p.${c} IS NOT NULL AND p.${c} <> '')`).join(" OR ")})
    AND p.updated_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)
    AND EXISTS (SELECT 1 FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
                WHERE r.user_id = p.user_id AND e.end_date < DATE_SUB(UTC_DATE(), INTERVAL ? DAY))
    AND NOT EXISTS (SELECT 1 FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
                WHERE r.user_id = p.user_id AND r.status NOT IN ('cancelled', 'rejected') AND e.end_date >= DATE_SUB(UTC_DATE(), INTERVAL ? DAY))`;

const DUE_REGISTRATIONS_SQL = `
  FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
  WHERE e.end_date < DATE_SUB(UTC_DATE(), INTERVAL ? DAY)
    AND (${REGISTRATION_COLUMNS.map((c) => `(r.${c} IS NOT NULL AND r.${c} <> '')`).join(" OR ")})`;

/** How much a run would delete right now (nothing is changed). */
export async function previewRetention(days: number): Promise<RetentionPreview> {
  const preview: RetentionPreview = { profiles: 0, files: 0, registrations: 0 };
  try {
    const counts = PROFILE_COLUMNS.map((c) => `SUM(p.${c} IS NOT NULL AND p.${c} <> '') AS ${c}`).join(", ");
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n, ${counts} ${DUE_PROFILES_SQL}`, [days, days, days]);
    preview.profiles = Number(rows[0]?.n ?? 0);
    preview.files = PROFILE_COLUMNS.reduce((sum, c) => sum + Number(rows[0]?.[c] ?? 0), 0);
    const [regs] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n ${DUE_REGISTRATIONS_SQL}`, [days]);
    preview.registrations = Number(regs[0]?.n ?? 0);
  } catch (err) {
    if (!missing(err)) throw err;
  }
  return preview;
}

export async function listRetentionRuns(limit = 10): Promise<RetentionRun[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, run_at, trigger_kind, days, profiles_cleared, files_removed, registrations_cleared FROM data_retention_runs ORDER BY id DESC LIMIT ?",
      [limit]
    );
    return rows.map((r) => ({
      id: Number(r.id),
      runAt: new Date(String(r.run_at).replace(" ", "T") + "Z").toISOString(),
      trigger: r.trigger_kind === "manual" ? "manual" : "auto",
      days: Number(r.days),
      profilesCleared: Number(r.profiles_cleared),
      filesRemoved: Number(r.files_removed),
      registrationsCleared: Number(r.registrations_cleared),
    }));
  } catch (err) {
    if (missing(err)) return [];
    throw err;
  }
}

/**
 * Deletes what is due. `auto` (the daily job) does nothing unless the policy is on; `manual` (an admin pressing the button)
 * always runs with the chosen number of days. Returns what was deleted.
 */
export async function runRetention(trigger: "auto" | "manual", adminId: number | null, daysOverride?: number): Promise<RetentionPreview> {
  const none: RetentionPreview = { profiles: 0, files: 0, registrations: 0 };
  const settings = await getRetentionSettings();
  if (!settings) return none;
  if (trigger === "auto" && !settings.enabled) return none;
  const days = daysOverride ?? settings.days;
  if (!isRetentionDays(days)) return none;

  try {
    return await clearDue(trigger, adminId, days);
  } catch (err) {
    // A column or table that a later migration adds is not there yet: nothing to do.
    if (missing(err)) return none;
    throw err;
  }
}

async function clearDue(trigger: "auto" | "manual", adminId: number | null, days: number): Promise<RetentionPreview> {
  // Profiles: pick a limited set of buyers, then clear the three documents (and their review state) for exactly those.
  const [due] = await pool.query<RowDataPacket[]>(`SELECT p.user_id, ${PROFILE_COLUMNS.map((c) => `(p.${c} IS NOT NULL AND p.${c} <> '') AS has_${c}`).join(", ")} ${DUE_PROFILES_SQL} ORDER BY p.user_id LIMIT ${BATCH}`, [days, days, days]);
  let files = 0;
  if (due.length > 0) {
    for (const row of due) for (const c of PROFILE_COLUMNS) files += Number(row[`has_${c}`] ?? 0);
    const sets = PROFILE_COLUMNS.flatMap((c) => [`${c} = NULL`, `${c}_status = 'pending'`, `${c}_note = ''`]).join(", ");
    await pool.query(`UPDATE buyer_profiles SET ${sets} WHERE user_id IN (?)`, [due.map((r) => Number(r.user_id))]);
  }

  // Registrations of exhibitions that ended long ago: their copies of the passport and visa pages.
  const [regs] = await pool.query<RowDataPacket[]>(`SELECT r.id ${DUE_REGISTRATIONS_SQL} ORDER BY r.id LIMIT ${BATCH * 2}`, [days]);
  if (regs.length > 0) {
    await pool.query<ResultSetHeader>(`UPDATE expo_registrations SET ${REGISTRATION_COLUMNS.map((c) => `${c} = ''`).join(", ")} WHERE id IN (?)`, [regs.map((r) => Number(r.id))]);
  }

  const result: RetentionPreview = { profiles: due.length, files, registrations: regs.length };
  if (result.profiles > 0 || result.registrations > 0 || trigger === "manual") {
    await pool.query("INSERT INTO data_retention_runs (run_at, trigger_kind, days, admin_id, profiles_cleared, files_removed, registrations_cleared) VALUES (UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?)", [trigger, days, adminId, result.profiles, result.files, result.registrations]);
    await pool.query("DELETE FROM data_retention_runs WHERE id NOT IN (SELECT id FROM (SELECT id FROM data_retention_runs ORDER BY id DESC LIMIT ?) keep)", [KEEP_RUNS]);
  }
  return result;
}
