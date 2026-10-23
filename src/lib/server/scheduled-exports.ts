import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { EMAIL_RE, isMailEnabled, sendMail } from "@/lib/server/mail";
import { buildAllRegistrationsExcel, readFilter } from "@/lib/server/all-registrations";
import { buildMovementsExcel, buildWithdrawalsExcel } from "@/lib/server/wallet-export";

// Excel reports sent by e-mail on a schedule. Due ones are sent by the daily job (the same one that sends reminders:
// the admin home, or the nightly workflow). A report is claimed before it is built, so two runs never send it twice.

export const KINDS = ["registrations", "withdrawals", "movements"] as const;
export type Kind = (typeof KINDS)[number];
export const FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const MAX_REPORTS = 20;
export const MAX_RECIPIENTS = 10;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export interface ScheduledExport {
  id: number;
  name: string;
  kind: Kind;
  filters: Record<string, string>;
  frequency: Frequency;
  weekday: number;
  monthDay: number;
  recipients: string[];
  enabled: boolean;
  lastSentAt: string | null;
  lastStatus: string;
}

function missing(err: unknown): boolean {
  return (err as { code?: string }).code === "ER_NO_SUCH_TABLE";
}

function toExport(r: RowDataPacket): ScheduledExport {
  let filters: Record<string, string> = {};
  try { filters = JSON.parse(String(r.filters_json)); } catch {}
  return {
    id: Number(r.id), name: String(r.name), kind: r.kind as Kind, filters, frequency: r.frequency as Frequency,
    weekday: Number(r.weekday), monthDay: Number(r.month_day), recipients: String(r.recipients).split(",").map((x) => x.trim()).filter(Boolean),
    enabled: !!r.enabled, lastSentAt: r.last_sent_at ? new Date(r.last_sent_at).toISOString() : null, lastStatus: String(r.last_status ?? ""),
  };
}

export async function listScheduledExports(): Promise<ScheduledExport[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM scheduled_exports ORDER BY id");
    return rows.map(toExport);
  } catch (err) {
    if (missing(err)) return [];
    throw err;
  }
}

export interface ExportInput {
  name: string;
  kind: Kind;
  filters: Record<string, string>;
  frequency: Frequency;
  weekday: number;
  monthDay: number;
  recipients: string[];
  enabled: boolean;
}

/** Reads a request body into a valid report definition, or says what is wrong. */
export function parseExportInput(body: unknown): { ok: true; value: ExportInput } | { ok: false; code: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < 1 || name.length > 100) return { ok: false, code: "bad_name" };
  if (!KINDS.includes(b.kind as Kind)) return { ok: false, code: "bad_kind" };
  if (!FREQUENCIES.includes(b.frequency as Frequency)) return { ok: false, code: "bad_frequency" };
  const weekday = Number(b.weekday ?? 1), monthDay = Number(b.monthDay ?? 1);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !Number.isInteger(monthDay) || monthDay < 1 || monthDay > 28) return { ok: false, code: "bad_day" };
  const raw = Array.isArray(b.recipients) ? b.recipients : typeof b.recipients === "string" ? b.recipients.split(/[\n,;]+/) : null;
  if (!raw) return { ok: false, code: "bad_recipients" };
  const recipients = Array.from(new Set(raw.map((x) => String(x).trim().toLowerCase()).filter(Boolean)));
  if (recipients.length < 1 || recipients.length > MAX_RECIPIENTS || recipients.some((r) => r.length > 254 || !EMAIL_RE.test(r))) return { ok: false, code: "bad_recipients" };
  const filters: Record<string, string> = {};
  if (b.kind === "registrations" && b.filters && typeof b.filters === "object") {
    for (const key of ["exhibition", "status", "country"]) {
      const v = (b.filters as Record<string, unknown>)[key];
      if (typeof v === "string" && v.trim()) filters[key] = v.trim().slice(0, 200);
    }
  }
  if (b.kind === "withdrawals") {
    const v = (b.filters as Record<string, unknown> | undefined)?.status;
    filters.status = v === "paid" || v === "rejected" || v === "all" ? v : "pending";
  }
  return { ok: true, value: { name, kind: b.kind as Kind, filters, frequency: b.frequency as Frequency, weekday, monthDay, recipients, enabled: b.enabled !== false } };
}

export async function createScheduledExport(input: ExportInput, adminId: number): Promise<number | "limit" | "unavailable"> {
  try {
    const [count] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM scheduled_exports");
    if (Number(count[0]?.n ?? 0) >= MAX_REPORTS) return "limit";
    // The first report goes out on the next scheduled day, not at once.
    const [res] = await pool.query<ResultSetHeader>(
      "INSERT INTO scheduled_exports (name, kind, filters_json, frequency, weekday, month_day, recipients, enabled, last_sent_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?)",
      [input.name, input.kind, JSON.stringify(input.filters), input.frequency, input.weekday, input.monthDay, input.recipients.join(","), input.enabled ? 1 : 0, adminId]
    );
    return res.insertId;
  } catch (err) {
    if (missing(err)) return "unavailable";
    throw err;
  }
}

export async function updateScheduledExport(id: number, input: ExportInput): Promise<boolean> {
  const [res] = await pool.query<ResultSetHeader>(
    "UPDATE scheduled_exports SET name = ?, kind = ?, filters_json = ?, frequency = ?, weekday = ?, month_day = ?, recipients = ?, enabled = ? WHERE id = ?",
    [input.name, input.kind, JSON.stringify(input.filters), input.frequency, input.weekday, input.monthDay, input.recipients.join(","), input.enabled ? 1 : 0, id]
  );
  return res.affectedRows > 0;
}

export async function deleteScheduledExport(id: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT name FROM scheduled_exports WHERE id = ?", [id]);
  if (!rows[0]) return null;
  await pool.query("DELETE FROM scheduled_exports WHERE id = ?", [id]);
  return String(rows[0].name);
}

// ----- when is a report due? -----

const DAY_MS = 86_400_000;
const dayStart = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Was it due since it last went out? (UTC days.) A missed day is made up for on the next run. */
export function isDue(e: Pick<ScheduledExport, "frequency" | "weekday" | "monthDay" | "lastSentAt" | "enabled">, now = new Date()): boolean {
  if (!e.enabled) return false;
  if (!e.lastSentAt) return true;
  const last = dayStart(new Date(e.lastSentAt));
  const today = dayStart(now);
  if (e.frequency === "daily") return last < today;
  if (e.frequency === "weekly") {
    const back = (now.getUTCDay() - e.weekday + 7) % 7;
    return last < today - back * DAY_MS;
  }
  // Monthly: this month's day has come, and nothing went out since it.
  const thisMonthsDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), e.monthDay);
  const target = today >= thisMonthsDay ? thisMonthsDay : Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, e.monthDay);
  return last < target;
}

// ----- building and sending -----

export async function buildReport(e: Pick<ScheduledExport, "kind" | "filters">): Promise<{ buffer: Buffer; filename: string; note: string }> {
  const date = new Date().toISOString().slice(0, 10);
  if (e.kind === "registrations") {
    const params = new URLSearchParams(e.filters);
    const { buffer, truncated } = await buildAllRegistrationsExcel(readFilter(params));
    return { buffer, filename: `registrations-${date}.xlsx`, note: truncated ? "truncated" : "" };
  }
  if (e.kind === "withdrawals") {
    return { buffer: await buildWithdrawalsExcel(e.filters.status ?? "pending"), filename: `withdrawals-${date}.xlsx`, note: "" };
  }
  // Points movements of the last 7 days.
  const to = date;
  const from = new Date(Date.now() - 6 * DAY_MS).toISOString().slice(0, 10);
  const { buffer, truncated } = await buildMovementsExcel(from, to);
  return { buffer, filename: `points-movements-${from}_${to}.xlsx`, note: truncated ? "truncated" : "" };
}

async function deliver(e: ScheduledExport): Promise<string> {
  const { buffer, filename, note } = await buildReport(e);
  if (buffer.length > MAX_ATTACHMENT_BYTES) return "too_large";
  const text = `The scheduled report "${e.name}" is attached (${filename}).${note ? " It was cut short because it is very large; use the Export button in the admin for the full list." : ""}\n\nThe Unique Expo`;
  const html = `<p>The scheduled report <strong>${e.name.replace(/[<>&"]/g, "")}</strong> is attached (${filename}).</p>${note ? "<p>It was cut short because it is very large; use the Export button in the admin for the full list.</p>" : ""}<p>The Unique Expo</p>`;
  let failures = 0;
  for (const to of e.recipients) {
    const sent = await sendMail({
      to, kind: "scheduledReport", subject: `${e.name} (${filename.replace(/\.xlsx$/, "")})`, text, html,
      attachments: [{ filename, content: buffer, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }],
    });
    if (!sent.ok) failures += 1;
  }
  return failures === 0 ? "sent" : failures === e.recipients.length ? "failed" : "partly_failed";
}

/** Sends one report now, whatever the schedule (the "Send now" button). */
export async function sendReportNow(id: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM scheduled_exports WHERE id = ?", [id]);
  if (!rows[0]) return null;
  const e = toExport(rows[0]);
  const status = await deliver(e);
  await pool.query("UPDATE scheduled_exports SET last_status = ?, last_sent_at = IF(?, UTC_TIMESTAMP(), last_sent_at) WHERE id = ?", [status, status === "sent" ? 1 : 0, id]);
  return status;
}

/** The daily job: sends every report that is due (only when e-mail is on). Returns how many went out. */
export async function runScheduledExports(): Promise<number> {
  if (!(await isMailEnabled())) return 0;
  let sent = 0;
  for (const e of await listScheduledExports()) {
    if (!isDue(e)) continue;
    // Claimed first (the old last-sent time must still be there), so a second run at the same moment skips it.
    const [claim] = await pool.query<ResultSetHeader>("UPDATE scheduled_exports SET last_sent_at = UTC_TIMESTAMP(), last_status = 'sending' WHERE id = ? AND (last_sent_at <=> ?)", [e.id, e.lastSentAt ? new Date(e.lastSentAt) : null]);
    if (claim.affectedRows !== 1) continue;
    let status = "failed";
    try { status = await deliver(e); } catch (err) { console.error("Scheduled export failed:", err); }
    await pool.query("UPDATE scheduled_exports SET last_status = ? WHERE id = ?", [status, e.id]);
    if (status === "sent") sent += 1;
  }
  return sent;
}
