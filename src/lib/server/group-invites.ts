import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { EMAIL_RE, isMailEnabled, sendMailInBackground } from "@/lib/server/mail";
import { notifyUser, renderEmail, SITE_URL, type EmailLocale } from "@/lib/server/notifications";
import { isPlaceholderEmail } from "@/lib/login-id";

// Group registration: someone who has registered for an exhibition invites colleagues (by e-mail) to register too.
// Each colleague registers with their own account and documents -- a passport cannot be filled in on someone else's
// behalf -- so an invitation is a message with a link, and the inviter sees who has registered. Whether an invited
// colleague has registered is read from their account and registrations; only the invitation itself is stored.

export const MAX_PER_REQUEST = 10;
export const MAX_PER_EXHIBITION = 30;

export interface InviteEntry {
  email: string;
  name: string;
}

/** Splits what was typed ("Name <email>", one per line or separated by commas / semicolons) into entries and rejects. */
export function parseInviteList(text: string, ownEmail = ""): { entries: InviteEntry[]; invalid: string[] } {
  const entries: InviteEntry[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>([ownEmail.trim().toLowerCase()]);
  for (const raw of text.split(/[\n,;]+/)) {
    const token = raw.trim();
    if (!token) continue;
    const m = /^(.*?)<([^<>]+)>$/.exec(token);
    const email = (m ? m[2] : token).trim().toLowerCase();
    const name = m ? m[1].trim().replace(/^["']|["']$/g, "").slice(0, 120) : "";
    if (!email || email.length > 254 || !EMAIL_RE.test(email) || isPlaceholderEmail(email)) {
      invalid.push(token.slice(0, 80));
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    entries.push({ email, name });
  }
  return { entries, invalid };
}

export type InviteOutcome = "invited" | "already_invited" | "already_registered" | "limit_reached";

export interface InviteResult {
  email: string;
  outcome: InviteOutcome;
}

interface Inviter {
  id: number;
  name: string;
  company: string;
}

function isMissingTable(err: unknown): boolean {
  return (err as { code?: string }).code === "ER_NO_SUCH_TABLE";
}

export async function inviteColleagues(
  inviter: Inviter,
  exhibition: { id: number; title: string; slug: string },
  entries: InviteEntry[],
  locale: EmailLocale
): Promise<{ results: InviteResult[]; mailOn: boolean }> {
  const mailOn = await isMailEnabled();
  const results: InviteResult[] = [];
  let count = 0;
  try {
    const [existing] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM group_invites WHERE inviter_id = ? AND exhibition_id = ?", [inviter.id, exhibition.id]);
    count = Number(existing[0]?.n ?? 0);
  } catch (err) {
    if (!isMissingTable(err)) throw err;
    return { results: entries.map((e) => ({ email: e.email, outcome: "limit_reached" as const })), mailOn };
  }

  for (const entry of entries) {
    if (count >= MAX_PER_EXHIBITION) {
      results.push({ email: entry.email, outcome: "limit_reached" });
      continue;
    }
    // A colleague who already has an account and a live registration for this exhibition needs no invitation.
    const [people] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.name, u.status FROM users u WHERE LOWER(u.email) = ? LIMIT 1`,
      [entry.email]
    );
    const person = people[0];
    if (person) {
      const [regs] = await pool.query<RowDataPacket[]>(
        "SELECT 1 FROM expo_registrations WHERE user_id = ? AND exhibition_id = ? AND status <> 'cancelled' LIMIT 1",
        [person.id, exhibition.id]
      );
      if (regs[0]) {
        results.push({ email: entry.email, outcome: "already_registered" });
        continue;
      }
    }
    const [res] = await pool.query<ResultSetHeader>(
      "INSERT IGNORE INTO group_invites (inviter_id, exhibition_id, email, name, last_sent_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())",
      [inviter.id, exhibition.id, entry.email, entry.name]
    );
    if (res.affectedRows !== 1) {
      results.push({ email: entry.email, outcome: "already_invited" });
      continue;
    }
    count += 1;
    results.push({ email: entry.email, outcome: "invited" });
    const vars = { inviter: inviter.name || "A colleague", company: inviter.company || "their company", expo: exhibition.title };
    if (person && person.status !== "suspended") {
      // Has an account: shown on their notifications page too, and e-mailed in their own language.
      notifyUser(Number(person.id), "groupInvite", vars, { path: `/exhibitions/${exhibition.slug}/register` });
    } else if (!person && mailOn) {
      // No account yet: a plain invitation to the given address, in the inviter's language.
      renderEmail(locale, "groupInvite", entry.name, vars, { url: `${SITE_URL}/${locale}/exhibitions/${exhibition.slug}/register` })
        .then((mail) => sendMailInBackground({ to: entry.email, kind: "groupInvite", ...mail }))
        .catch((err) => console.error("Invitation e-mail failed:", err));
    }
  }
  return { results, mailOn };
}

export type InviteStatus = "invited" | "registered" | "approved" | "confirmed" | "attended" | "rejected";

export interface InviteView {
  email: string;
  name: string;
  invitedAt: string;
  /** What the colleague has done since: nothing yet, or the status of their registration for this exhibition. */
  status: InviteStatus;
}

export async function listInvites(inviterId: number, exhibitionId: number): Promise<InviteView[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT gi.email, gi.name, gi.created_at,
              (SELECT r.status FROM expo_registrations r JOIN users u ON u.id = r.user_id
               WHERE LOWER(u.email) = gi.email AND r.exhibition_id = gi.exhibition_id AND r.status <> 'cancelled' ORDER BY r.id DESC LIMIT 1) AS reg_status
       FROM group_invites gi WHERE gi.inviter_id = ? AND gi.exhibition_id = ? ORDER BY gi.id DESC`,
      [inviterId, exhibitionId]
    );
    return rows.map((r) => ({
      email: String(r.email),
      name: String(r.name ?? ""),
      invitedAt: new Date(r.created_at).toISOString(),
      status: !r.reg_status ? "invited" : r.reg_status === "pending" ? "registered" : (r.reg_status as InviteStatus),
    }));
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}
