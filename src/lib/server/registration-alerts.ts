import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { notifyUser } from "@/lib/server/notifications";
import { documentProblems } from "@/lib/document-expiry";

// Daily alerts tied to registration: (1) someone who saved an exhibition hears when its registration opens and when it
// is about to close; (2) someone registered for an exhibition hears when their passport or visa will not cover it. Each
// is told once (the memory is saved_exhibition_alerts / document_alerts_sent, claimed before the message goes out, so two
// runs at once never send twice). Everything tolerates the tables / columns not existing yet.

const CLOSING_ALERT_DAYS = 3;
const MAX_PER_RUN = 200;
// Documents are only checked for exhibitions starting within this many days (a new passport takes time, but not a year).
const DOCUMENT_CHECK_DAYS = 180;

function isMissing(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === "ER_BAD_FIELD_ERROR" || code === "ER_NO_SUCH_TABLE";
}

function day(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "").slice(0, 10);
}

// People who have not registered (or have only cancelled) and saved the exhibition.
const NOT_REGISTERED_SQL = `NOT EXISTS (SELECT 1 FROM expo_registrations r WHERE r.user_id = f.user_id AND r.exhibition_id = f.exhibition_id AND r.status <> 'cancelled')`;
const NOT_TOLD_SQL = (kind: string) => `NOT EXISTS (SELECT 1 FROM saved_exhibition_alerts a WHERE a.user_id = f.user_id AND a.exhibition_id = f.exhibition_id AND a.kind = '${kind}')`;

async function claimSaved(userId: number, exhibitionId: number, kind: "opened" | "closing"): Promise<boolean> {
  const [res] = await pool.query<ResultSetHeader>("INSERT IGNORE INTO saved_exhibition_alerts (user_id, exhibition_id, kind) VALUES (?, ?, ?)", [userId, exhibitionId, kind]);
  return res.affectedRows === 1;
}

export async function sendSavedExhibitionAlerts(): Promise<{ opened: number; closing: number }> {
  let opened = 0;
  let closing = 0;
  try {
    // Registration opened (on a date the admin set) after the person saved the exhibition.
    const [openRows] = await pool.query<RowDataPacket[]>(
      `SELECT f.user_id, f.exhibition_id, e.title, e.slug
       FROM exhibition_favorites f JOIN exhibitions e ON e.id = f.exhibition_id JOIN users u ON u.id = f.user_id
       WHERE e.registration_enabled = 1 AND e.registration_opens IS NOT NULL AND e.registration_opens <= UTC_DATE()
         AND (e.registration_closes IS NULL OR e.registration_closes >= UTC_DATE()) AND e.end_date >= UTC_DATE()
         AND f.created_at < DATE_ADD(e.registration_opens, INTERVAL 1 DAY)
         AND u.status <> 'suspended' AND ${NOT_REGISTERED_SQL} AND ${NOT_TOLD_SQL("opened")}
       LIMIT ${MAX_PER_RUN}`
    );
    for (const r of openRows) {
      if (!(await claimSaved(r.user_id, r.exhibition_id, "opened"))) continue;
      notifyUser(r.user_id, "savedRegistrationOpened", { expo: String(r.title) }, { path: `/exhibitions/${String(r.slug)}/register` });
      opened += 1;
    }
    // The last day to register is close.
    const [closeRows] = await pool.query<RowDataPacket[]>(
      `SELECT f.user_id, f.exhibition_id, e.title, e.slug, e.registration_closes
       FROM exhibition_favorites f JOIN exhibitions e ON e.id = f.exhibition_id JOIN users u ON u.id = f.user_id
       WHERE e.registration_enabled = 1 AND e.registration_closes IS NOT NULL
         AND e.registration_closes >= UTC_DATE() AND e.registration_closes <= DATE_ADD(UTC_DATE(), INTERVAL ${CLOSING_ALERT_DAYS} DAY)
         AND (e.registration_opens IS NULL OR e.registration_opens <= UTC_DATE()) AND e.end_date >= UTC_DATE()
         AND u.status <> 'suspended' AND ${NOT_REGISTERED_SQL} AND ${NOT_TOLD_SQL("closing")}
       LIMIT ${MAX_PER_RUN}`
    );
    for (const r of closeRows) {
      if (!(await claimSaved(r.user_id, r.exhibition_id, "closing"))) continue;
      notifyUser(r.user_id, "savedRegistrationClosing", { expo: String(r.title), date: day(r.registration_closes) }, { path: `/exhibitions/${String(r.slug)}/register` });
      closing += 1;
    }
  } catch (err) {
    if (!isMissing(err)) throw err;
  }
  return { opened, closing };
}

export async function sendDocumentExpiryAlerts(): Promise<{ passport: number; visa: number }> {
  let passport = 0;
  let visa = 0;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.id AS reg_id, r.user_id, e.title, e.slug, e.end_date, p.passport_expire_date, p.visa_expire_date
       FROM expo_registrations r
       JOIN exhibitions e ON e.id = r.exhibition_id
       JOIN buyer_profiles p ON p.user_id = r.user_id
       JOIN users u ON u.id = r.user_id
       WHERE r.status IN ('pending', 'approved', 'confirmed') AND u.status <> 'suspended'
         AND e.end_date >= UTC_DATE() AND e.start_date <= DATE_ADD(UTC_DATE(), INTERVAL ${DOCUMENT_CHECK_DAYS} DAY)
         AND (p.passport_expire_date <> '' OR p.visa_expire_date <> '')
       ORDER BY e.start_date LIMIT ${MAX_PER_RUN * 5}`
    );
    for (const r of rows) {
      const expoEnd = day(r.end_date);
      for (const problem of documentProblems({ passportExpires: r.passport_expire_date, visaExpires: r.visa_expire_date, expoEnd })) {
        const kind = problem === "passport" ? "passportExpiring" : "visaExpiring";
        const [claim] = await pool.query<ResultSetHeader>("INSERT IGNORE INTO document_alerts_sent (user_id, registration_id, kind) VALUES (?, ?, ?)", [r.user_id, r.reg_id, problem]);
        if (claim.affectedRows !== 1) continue;
        const vars: Record<string, string> = { expo: String(r.title), endDate: expoEnd };
        if (problem === "passport") vars.passportDate = String(r.passport_expire_date).slice(0, 10);
        else vars.visaDate = String(r.visa_expire_date).slice(0, 10);
        notifyUser(r.user_id, kind, vars, { path: "/dashboard/buyer/profile" });
        if (problem === "passport") passport += 1;
        else visa += 1;
      }
    }
  } catch (err) {
    if (!isMissing(err)) throw err;
  }
  return { passport, visa };
}

/** Adds `documentWarnings` to the registrations that are still going ahead, from the passport / visa dates on the profile. */
export async function withDocumentWarnings<T extends { status: string; exhibitionEnd: string }>(userId: number, registrations: T[]): Promise<(T & { documentWarnings?: ("passport" | "visa")[] })[]> {
  const live = registrations.filter((r) => ["pending", "approved", "confirmed"].includes(r.status) && r.exhibitionEnd >= new Date().toISOString().slice(0, 10));
  if (live.length === 0) return registrations;
  let passport = "";
  let visa = "";
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT passport_expire_date, visa_expire_date FROM buyer_profiles WHERE user_id = ?", [userId]);
    passport = String(rows[0]?.passport_expire_date ?? "");
    visa = String(rows[0]?.visa_expire_date ?? "");
  } catch (err) {
    if (!isMissing(err)) throw err;
    return registrations;
  }
  return registrations.map((r) => {
    if (!live.includes(r)) return r;
    const problems = documentProblems({ passportExpires: passport, visaExpires: visa, expoEnd: r.exhibitionEnd.slice(0, 10) });
    return problems.length ? { ...r, documentWarnings: problems } : r;
  });
}
