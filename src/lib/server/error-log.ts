import { createHash } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// Errors seen by the website, grouped by what they say. Two sources: "server" (an unhandled error while answering a request,
// or something the code logged with console.error) and "client" (a script error in a visitor's browser). Every report is
// small, deduplicated by a fingerprint (the same error many times is one row with a count) and capped, so a loop of errors
// cannot fill the database or flood the admins' inboxes.

const MAX_MESSAGE = 500;
const MAX_DETAIL = 4000;
const MAX_ROWS = 2000;
const WRITES_PER_MINUTE = 30;
const ALERT_DELAY_MS = 60_000;
const ALERT_MAX_LIST = 10;

export interface ErrorReport {
  source: "server" | "client";
  message: string;
  detail?: string;
  path?: string;
  userAgent?: string;
}

// Things that are not the website's fault or cannot be acted on.
const IGNORED = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /chrome-extension:\/\/|moz-extension:\/\/|safari-extension:\/\//i,
  /Non-Error promise rejection captured/i,
  /Load failed$|Failed to fetch$|NetworkError when attempting to fetch|Network request failed|The operation was aborted|AbortError/i,
  /ChunkLoadError|Loading chunk \S+ failed|Failed to load chunk/i,
  /Too many requests/i,
  /ECONNRESET|socket hang up|read ECONNRESET/i,
];

function missing(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR";
}

/** Numbers, hex ids and quoted values vary between occurrences of the same error; they are taken out for grouping. */
export function normalizeMessage(message: string): string {
  return message
    .replace(/0x[0-9a-f]+/gi, "0x?")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "<id>")
    .replace(/\b\d+\b/g, "#")
    .replace(/(["'`]).{1,80}?\1/g, "$1…$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE);
}

export function fingerprintOf(source: string, message: string, detail = ""): string {
  const firstFrame = /\n\s*at\s+([^\n(]+)\(?([^\n)]*)/.exec(detail);
  const where = firstFrame ? `${firstFrame[1].trim()}${firstFrame[2].replace(/:\d+:\d+$/, "").replace(/\?.*$/, "")}` : "";
  return createHash("sha1").update(`${source}|${normalizeMessage(message)}|${where}`).digest("hex");
}

export function isIgnoredError(message: string): boolean {
  return IGNORED.some((re) => re.test(message));
}

// ----- writing -----

let busy = false;
let windowStart = 0;
let writes = 0;

/** Records one error. Never throws, never recurses (an error while recording is dropped) and never writes more than 30 a minute. */
export async function recordError(report: ErrorReport): Promise<void> {
  if (busy) return;
  const message = String(report.message ?? "").slice(0, MAX_MESSAGE);
  if (!message || isIgnoredError(message)) return;
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    writes = 0;
  }
  if (writes >= WRITES_PER_MINUTE) return;
  writes += 1;
  busy = true;
  try {
    const detail = (report.detail ?? "").slice(0, MAX_DETAIL);
    const [res] = await pool.query<ResultSetHeader>(
      `INSERT INTO error_log (fingerprint, source, message, detail, path, user_agent, first_at, last_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE occurrences = occurrences + 1, last_at = UTC_TIMESTAMP(), resolved_at = NULL, detail = COALESCE(NULLIF(VALUES(detail), ''), detail)`,
      [fingerprintOf(report.source, message, detail), report.source, message, detail || null, (report.path ?? "").slice(0, 300), (report.userAgent ?? "").slice(0, 160)]
    );
    // affectedRows is 1 for a new row and 2 for an updated one.
    if (res.affectedRows === 1) scheduleAlert();
  } catch (err) {
    if (!missing(err)) process.stderr.write(`Could not record an error: ${(err as Error).message}\n`);
  } finally {
    busy = false;
  }
}

// ----- alerts -----

let alertTimer: ReturnType<typeof setTimeout> | null = null;
/** A new error is e-mailed to the admins a minute later, together with any others that arrived meanwhile. */
function scheduleAlert(): void {
  if (alertTimer) return;
  alertTimer = setTimeout(() => {
    alertTimer = null;
    sendErrorAlerts().catch(() => {});
  }, ALERT_DELAY_MS);
  alertTimer.unref?.();
}

/** Sends one e-mail listing the errors not told to the admins yet (when e-mail is on). Returns how many errors were in it. */
export async function sendErrorAlerts(): Promise<number> {
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>("SELECT id, source, message, path, occurrences FROM error_log WHERE alerted_at IS NULL AND resolved_at IS NULL AND last_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) ORDER BY last_at DESC LIMIT 50");
  } catch (err) {
    if (missing(err)) return 0;
    throw err;
  }
  if (rows.length === 0) return 0;
  const { isMailEnabled, sendMail } = await import("@/lib/server/mail");
  if (!(await isMailEnabled())) return 0;
  // Claimed first, so a second run at the same moment sends nothing.
  const ids = rows.map((r) => Number(r.id));
  const [claim] = await pool.query<ResultSetHeader>("UPDATE error_log SET alerted_at = UTC_TIMESTAMP() WHERE id IN (?) AND alerted_at IS NULL", [ids]);
  if (claim.affectedRows === 0) return 0;
  const [admins] = await pool.query<RowDataPacket[]>("SELECT id, email FROM users WHERE role = 'admin' AND status <> 'suspended' AND email LIKE '%@%' ORDER BY id LIMIT 20");
  const shown = rows.slice(0, ALERT_MAX_LIST);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://theuniqueexpo.com").replace(/\/+$/, "");
  const lines = shown.map((r) => `- [${String(r.source)}] ${String(r.message).slice(0, 200)}${r.path ? ` (${String(r.path).slice(0, 80)})` : ""}${Number(r.occurrences) > 1 ? ` x${Number(r.occurrences)}` : ""}`);
  const more = rows.length > shown.length ? `\n…and ${rows.length - shown.length} more.` : "";
  const subject = rows.length === 1 ? "The website reported a new error" : `The website reported ${rows.length} new errors`;
  const text = `${subject}:\n\n${lines.join("\n")}${more}\n\nDetails and a button to mark each one resolved: ${site}/en/admin/errors\n\nThe Unique Expo`;
  const esc = (s: string) => s.replace(/[<>&"]/g, "");
  const html = `<p>${subject}:</p><ul>${shown.map((r) => `<li><strong>${esc(String(r.source))}</strong> ${esc(String(r.message).slice(0, 200))}${r.path ? ` <em>${esc(String(r.path).slice(0, 80))}</em>` : ""}${Number(r.occurrences) > 1 ? ` &times;${Number(r.occurrences)}` : ""}</li>`).join("")}</ul>${more ? `<p>${esc(more.trim())}</p>` : ""}<p><a href="${site}/en/admin/errors">Open Admin → Errors</a></p><p>The Unique Expo</p>`;
  for (const a of admins) await sendMail({ to: String(a.email), userId: Number(a.id), kind: "errorAlert", subject, text, html });
  return rows.length;
}

// ----- reading -----

export interface ErrorRow {
  id: number;
  source: "server" | "client";
  message: string;
  detail: string;
  path: string;
  userAgent: string;
  occurrences: number;
  firstAt: string;
  lastAt: string;
  resolved: boolean;
}

const iso = (v: unknown) => new Date(String(v).replace(" ", "T") + "Z").toISOString();

export async function listErrors(options: { includeResolved?: boolean; limit?: number } = {}): Promise<ErrorRow[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, source, message, detail, path, user_agent, occurrences, first_at, last_at, resolved_at FROM error_log ${options.includeResolved ? "" : "WHERE resolved_at IS NULL"} ORDER BY last_at DESC LIMIT ?`,
      [options.limit ?? 100]
    );
    return rows.map((r) => ({
      id: Number(r.id), source: r.source === "client" ? "client" : "server", message: String(r.message), detail: String(r.detail ?? ""), path: String(r.path ?? ""), userAgent: String(r.user_agent ?? ""),
      occurrences: Number(r.occurrences), firstAt: iso(r.first_at), lastAt: iso(r.last_at), resolved: !!r.resolved_at,
    }));
  } catch (err) {
    if (missing(err)) return [];
    throw err;
  }
}

export async function setErrorResolved(id: number, resolved: boolean): Promise<boolean> {
  try {
    const [r] = await pool.query<ResultSetHeader>(`UPDATE error_log SET resolved_at = ${resolved ? "UTC_TIMESTAMP()" : "NULL"} WHERE id = ?`, [id]);
    return r.affectedRows === 1;
  } catch (err) {
    if (missing(err)) return false;
    throw err;
  }
}

/** Unresolved errors seen in the last 24 hours (for the health report). */
export async function recentErrorCount(): Promise<number> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM error_log WHERE resolved_at IS NULL AND last_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)");
    return Number(rows[0]?.n ?? 0);
  } catch (err) {
    if (missing(err)) return 0;
    throw err;
  }
}

/** Keeps the table small: nothing older than 90 days, and at most 2000 rows. */
export async function pruneErrors(): Promise<number> {
  try {
    const [a] = await pool.query<ResultSetHeader>("DELETE FROM error_log WHERE last_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 DAY)");
    const [b] = await pool.query<ResultSetHeader>(`DELETE FROM error_log WHERE id NOT IN (SELECT id FROM (SELECT id FROM error_log ORDER BY last_at DESC LIMIT ${MAX_ROWS}) keep)`);
    return a.affectedRows + b.affectedRows;
  } catch (err) {
    if (missing(err)) return 0;
    throw err;
  }
}
