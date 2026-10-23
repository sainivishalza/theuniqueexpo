import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// E-mail bounces. When a message cannot be delivered the receiving server sends a "delivery status notification" back to
// the mailbox the website sends from. A scheduled job (.github/workflows/mail-bounces.yml) reads that mailbox and hands each
// notification to /api/cron/mail-bounces, which comes here.
//
//  - A HARD bounce (status 5.x.x: no such user, address rejected) puts the address on a list: the website stops e-mailing it
//    (except sign-in security mails) until an admin clears it, and the admin screens show it as "e-mail bounced".
//  - A SOFT bounce (4.x.x: mailbox full, server busy) is only counted.
//
// Only an address the website really e-mailed lately (email_log) can be flagged, so a stray or forged message cannot
// put an arbitrary address on the list.

export interface ParsedBounce {
  email: string;
  kind: "hard" | "soft";
  statusCode: string;
  reason: string;
}

export interface BounceRow {
  id: number;
  email: string;
  kind: "hard" | "soft";
  reason: string;
  statusCode: string;
  count: number;
  firstAt: string;
  lastAt: string;
  cleared: boolean;
}

const EMAIL = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SUBJECT_HINT = /undeliver|delivery (status|failure|has failed)|returned mail|failure notice|mail delivery (failed|subsystem)|could not be delivered|not delivered|bounce/i;
const HARD_HINT = /\b5\.\d{1,3}\.\d{1,3}\b|\b55\d\b|user unknown|does not exist|no such user|address not found|invalid recipient|mailbox unavailable|recipient rejected|unknown user|account (has been )?disabled/i;

function unfold(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\n[ \t]+/g, " ");
}

function header(block: string, name: string): string {
  const m = new RegExp(`^${name}:[ \\t]*(.*)$`, "im").exec(block);
  return m ? m[1].trim() : "";
}

function cleanReason(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 300);
}

/**
 * Reads one bounce message. The structured report (RFC 3464, "Final-Recipient / Action / Status") is used when it is there;
 * otherwise, for a message that looks like a bounce, the addresses in it that the website e-mailed lately.
 * `knownAddresses` is the list of lower-case addresses it is allowed to flag (from email_log).
 */
export function parseBounceMessage(raw: string, knownAddresses: ReadonlySet<string>): ParsedBounce[] {
  const text = unfold(raw);
  const found = new Map<string, ParsedBounce>();
  const add = (email: string, statusCode: string, reason: string, hard: boolean) => {
    const e = email.toLowerCase();
    if (!knownAddresses.has(e)) return;
    const prev = found.get(e);
    if (prev && (prev.kind === "hard" || !hard)) return;
    found.set(e, { email: e, kind: hard ? "hard" : "soft", statusCode, reason: cleanReason(reason) });
  };

  // Structured: every "Final-Recipient" block with its own Action and Status.
  const blocks = text.split(/\n(?=Final-Recipient:)/i).filter((b) => /^Final-Recipient:/i.test(b));
  for (const b of blocks) {
    const recipient = /rfc822;\s*<?([^>\s;]+)>?/i.exec(header(b, "Final-Recipient"))?.[1];
    if (!recipient) continue;
    const action = header(b, "Action").toLowerCase();
    if (action && action !== "failed" && action !== "delayed") continue; // "delivered", "relayed", "expanded" are not bounces
    const status = header(b, "Status").split(/\s/)[0];
    const diagnostic = header(b, "Diagnostic-Code").replace(/^[a-z]+;\s*/i, "");
    const hard = action === "failed" ? !/^4\./.test(status) : /^5\./.test(status);
    add(recipient, status, diagnostic || `Status ${status}`, hard);
  }
  if (found.size > 0) return [...found.values()];

  // Unstructured: a message that says it could not be delivered, naming an address we e-mailed.
  const subject = header(text, "Subject");
  if (!SUBJECT_HINT.test(subject) && !SUBJECT_HINT.test(text.slice(0, 2000))) return [];
  const hard = HARD_HINT.test(text);
  const body = text.split(/\n\n/).slice(1).join("\n\n").slice(0, 8000);
  for (const addr of new Set(body.match(EMAIL) ?? [])) {
    const index = body.toLowerCase().indexOf(addr.toLowerCase());
    add(addr, hard ? "5.0.0" : "4.0.0", body.slice(Math.max(0, index - 40), index + 160), hard);
  }
  return [...found.values()];
}

function missing(err: unknown): boolean {
  return (err as { code?: string }).code === "ER_NO_SUCH_TABLE";
}

/** The addresses the website e-mailed in the last 30 days. */
export async function recentlyMailedAddresses(): Promise<Set<string>> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT DISTINCT LOWER(to_email) AS e FROM email_log WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)");
    return new Set(rows.map((r) => String(r.e)));
  } catch (err) {
    if (missing(err)) return new Set();
    throw err;
  }
}

/** Writes a bounce down. A hard bounce is never turned back into a soft one by a later soft bounce. */
export async function recordBounce(b: ParsedBounce): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO email_bounces (email, kind, reason, status_code, first_at, last_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE
         bounce_count = bounce_count + 1,
         last_at = UTC_TIMESTAMP(),
         reason = VALUES(reason),
         status_code = VALUES(status_code),
         kind = IF(kind = 'hard' OR VALUES(kind) = 'hard', 'hard', 'soft'),
         cleared_at = IF(VALUES(kind) = 'hard', NULL, cleared_at)`,
      [b.email.toLowerCase(), b.kind, b.reason, b.statusCode.slice(0, 12)]
    );
    return true;
  } catch (err) {
    if (missing(err)) return false;
    throw err;
  }
}

export interface IngestResult {
  processed: number;
  hard: number;
  soft: number;
  ignored: number;
}

/** Handles a batch of raw bounce messages. */
export async function ingestBounceMessages(messages: string[]): Promise<IngestResult> {
  const result: IngestResult = { processed: messages.length, hard: 0, soft: 0, ignored: 0 };
  const known = await recentlyMailedAddresses();
  for (const raw of messages) {
    const parsed = parseBounceMessage(raw, known);
    if (parsed.length === 0) {
      result.ignored += 1;
      continue;
    }
    for (const b of parsed) {
      if (await recordBounce(b)) result[b.kind] += 1;
    }
  }
  return result;
}

// ----- what the screens and the mailer ask -----

function toRow(r: RowDataPacket): BounceRow {
  const iso = (v: unknown) => new Date(String(v).replace(" ", "T") + "Z").toISOString();
  return { id: Number(r.id), email: String(r.email), kind: r.kind === "hard" ? "hard" : "soft", reason: String(r.reason ?? ""), statusCode: String(r.status_code ?? ""), count: Number(r.bounce_count), firstAt: iso(r.first_at), lastAt: iso(r.last_at), cleared: !!r.cleared_at };
}

export async function listBounces(limit = 200): Promise<BounceRow[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM email_bounces WHERE cleared_at IS NULL ORDER BY (kind = 'hard') DESC, last_at DESC LIMIT ?", [limit]);
    return rows.map(toRow);
  } catch (err) {
    if (missing(err)) return [];
    throw err;
  }
}

/** Takes the flag off (the address is e-mailed again; a new hard bounce puts it back). */
export async function clearBounce(id: number): Promise<boolean> {
  try {
    const [r] = await pool.query<ResultSetHeader>("UPDATE email_bounces SET cleared_at = UTC_TIMESTAMP() WHERE id = ? AND cleared_at IS NULL", [id]);
    return r.affectedRows === 1;
  } catch (err) {
    if (missing(err)) return false;
    throw err;
  }
}

/** Addresses on the hard-bounce list (for the "e-mail bounced" badge in the admin lists). */
export async function hardBouncedAddresses(): Promise<string[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT email FROM email_bounces WHERE kind = 'hard' AND cleared_at IS NULL ORDER BY last_at DESC LIMIT 2000");
    return rows.map((r) => String(r.email));
  } catch (err) {
    if (missing(err)) return [];
    throw err;
  }
}

// The mailer checks this for every message; a short cache keeps it from asking the database each time.
let suppressed: { at: number; set: Set<string> } | null = null;
export function forgetSuppressed(): void {
  suppressed = null;
}
export async function isSuppressed(email: string): Promise<boolean> {
  if (!suppressed || Date.now() - suppressed.at > 30_000) {
    suppressed = { at: Date.now(), set: new Set(await hardBouncedAddresses()) };
  }
  return suppressed.set.has(email.toLowerCase());
}
