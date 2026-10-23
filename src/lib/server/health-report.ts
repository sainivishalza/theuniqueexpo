import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { recentErrorCount } from "@/lib/server/error-log";
import { isMailEnabled, sendMail } from "@/lib/server/mail";

// The daily health e-mail to admins, and the same numbers on Admin -> Health: how many registrations came in, how many
// e-mails failed, and when the last database backups were made (by a deploy, and by the nightly off-site copy).
// Sent once a day (the daily job), only when e-mail is on and an admin has not switched it off.

export interface BackupInfo {
  at: string;
  sizeBytes: number;
  name: string;
}
export interface HealthReport {
  generatedAt: string;
  newRegistrations: number;
  pendingRegistrations: number;
  emailsSent: number;
  emailsFailed: number;
  /** Errors reported by the website in the last 24 hours that nobody has marked resolved. */
  errors: number;
  mailOn: boolean;
  deployBackup: BackupInfo | null;
  offsiteBackup: BackupInfo | null;
  /** Things that need a person's attention, in plain English (the e-mail lists them first). */
  issues: string[];
}

const OFFSITE_STALE_DAYS = 3;
const DEPLOY_STALE_DAYS = 45;
const PENDING_BACKLOG = 50;

function missing(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR";
}

async function count(sql: string): Promise<number> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(sql);
    return Number(rows[0]?.n ?? 0);
  } catch (err) {
    if (missing(err)) return 0;
    throw err;
  }
}

async function lastBackup(kind: "deploy" | "offsite"): Promise<BackupInfo | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT file_name, size_bytes, created_at FROM backup_log WHERE kind = ? ORDER BY id DESC LIMIT 1", [kind]);
    if (!rows[0]) return null;
    return { name: String(rows[0].file_name), sizeBytes: Number(rows[0].size_bytes), at: new Date(String(rows[0].created_at).replace(" ", "T") + "Z").toISOString() };
  } catch (err) {
    if (missing(err)) return null;
    throw err;
  }
}

const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export async function buildHealthReport(): Promise<HealthReport> {
  const [newRegistrations, pendingRegistrations, emailsSent, emailsFailed, errors, mailOn, deployBackup, offsiteBackup] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM expo_registrations WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)"),
    count("SELECT COUNT(*) AS n FROM expo_registrations WHERE status = 'pending'"),
    count("SELECT COUNT(*) AS n FROM email_log WHERE status = 'sent' AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)"),
    count("SELECT COUNT(*) AS n FROM email_log WHERE status = 'failed' AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)"),
    recentErrorCount(),
    isMailEnabled().catch(() => false),
    lastBackup("deploy"),
    lastBackup("offsite"),
  ]);
  const issues: string[] = [];
  if (!offsiteBackup) issues.push("No off-site backup has been made yet. The only database backups are on the same server as the website.");
  else if (daysAgo(offsiteBackup.at) >= OFFSITE_STALE_DAYS) issues.push(`The last off-site backup is ${daysAgo(offsiteBackup.at)} days old.`);
  if (!deployBackup) issues.push("No backup made by a deploy is recorded yet.");
  else if (daysAgo(deployBackup.at) >= DEPLOY_STALE_DAYS) issues.push(`The last backup made by a deploy is ${daysAgo(deployBackup.at)} days old.`);
  if (emailsFailed > 0) issues.push(`${emailsFailed} e-mail${emailsFailed === 1 ? "" : "s"} failed to send in the last 24 hours.`);
  if (errors > 0) issues.push(`${errors} error${errors === 1 ? " was" : "s were"} reported by the website in the last 24 hours.`);
  if (pendingRegistrations >= PENDING_BACKLOG) issues.push(`${pendingRegistrations} registrations are waiting for review.`);
  return { generatedAt: new Date().toISOString(), newRegistrations, pendingRegistrations, emailsSent, emailsFailed, errors, mailOn, deployBackup, offsiteBackup, issues };
}

// ----- settings -----

export async function getHealthEnabled(): Promise<boolean | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT enabled FROM health_settings WHERE id = 1");
    return rows[0] ? !!rows[0].enabled : true;
  } catch (err) {
    if (missing(err)) return null;
    throw err;
  }
}

export async function saveHealthEnabled(enabled: boolean, adminId: number): Promise<boolean> {
  try {
    await pool.query("INSERT INTO health_settings (id, enabled, updated_by) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_by = VALUES(updated_by)", [enabled ? 1 : 0, adminId]);
    return true;
  } catch (err) {
    if (missing(err)) return false;
    throw err;
  }
}

export async function lastHealthEmailDay(): Promise<string | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT DATE_FORMAT(last_sent_on, '%Y-%m-%d') AS d FROM health_settings WHERE id = 1");
    return rows[0]?.d ? String(rows[0].d) : null;
  } catch (err) {
    if (missing(err)) return null;
    throw err;
  }
}

// ----- the e-mail -----

const fmtBytes = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmtBackup = (b: BackupInfo | null) => (b ? `${b.at.slice(0, 16).replace("T", " ")} UTC (${fmtBytes(b.sizeBytes)})` : "none recorded");
const esc = (s: string) => s.replace(/[<>&"]/g, "");

export function healthEmailContent(r: HealthReport, siteUrl: string): { subject: string; text: string; html: string } {
  const lines = [
    `New registrations in the last 24 hours: ${r.newRegistrations}`,
    `Registrations waiting for review: ${r.pendingRegistrations}`,
    `E-mails sent / failed in the last 24 hours: ${r.emailsSent} / ${r.emailsFailed}`,
    `Website errors reported in the last 24 hours: ${r.errors}`,
    `Last backup made by a deploy: ${fmtBackup(r.deployBackup)}`,
    `Last off-site backup: ${fmtBackup(r.offsiteBackup)}`,
  ];
  const subject = r.issues.length > 0 ? `Health: ${r.issues.length} thing${r.issues.length === 1 ? "" : "s"} to look at` : "Health: all fine";
  const attention = r.issues.length > 0 ? `Needs attention:\n${r.issues.map((i) => `- ${i}`).join("\n")}\n\n` : "Nothing needs attention.\n\n";
  const text = `${attention}${lines.join("\n")}\n\nDetails: ${siteUrl}/en/admin/health\n\nThe Unique Expo`;
  const html = `<p><strong>${r.issues.length > 0 ? "Needs attention" : "Nothing needs attention"}</strong></p>${r.issues.length > 0 ? `<ul>${r.issues.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p><a href="${siteUrl}/en/admin/health">Open Admin → Health</a></p><p>The Unique Expo</p>`;
  return { subject, text, html };
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://theuniqueexpo.com").replace(/\/+$/, "");
}

/** Sends the report to the given addresses. Returns how many were sent. */
export async function sendHealthEmail(recipients: { id: number; email: string }[]): Promise<number> {
  const report = await buildHealthReport();
  const content = healthEmailContent(report, siteUrl());
  let sent = 0;
  for (const to of recipients) {
    const res = await sendMail({ to: to.email, userId: to.id, kind: "dailyHealth", ...content });
    if (res.ok) sent += 1;
  }
  return sent;
}

/** The daily job: once a day (after 05:00 UTC), when e-mail is on and the report is switched on, to every active admin. */
export async function runDailyHealth(): Promise<number> {
  if (new Date().getUTCHours() < 5) return 0;
  if (!(await isMailEnabled())) return 0;
  if ((await getHealthEnabled()) !== true) return 0;
  let claim: ResultSetHeader;
  try {
    [claim] = await pool.query<ResultSetHeader>("UPDATE health_settings SET last_sent_on = UTC_DATE() WHERE id = 1 AND (last_sent_on IS NULL OR last_sent_on < UTC_DATE())");
  } catch (err) {
    if (missing(err)) return 0;
    throw err;
  }
  if (claim.affectedRows !== 1) return 0;
  const [admins] = await pool.query<RowDataPacket[]>("SELECT id, email FROM users WHERE role = 'admin' AND status <> 'suspended' AND email LIKE '%@%' ORDER BY id LIMIT 20");
  return sendHealthEmail(admins.map((a) => ({ id: Number(a.id), email: String(a.email) })));
}
