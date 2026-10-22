import { createTranslator } from "next-intl";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/login-id";
import { formatNumber } from "@/lib/format";
import { isMailEnabled, sendMail, sendMailInBackground } from "@/lib/server/mail";
import { getFormItems } from "@/lib/server/buyer-form-repo";

// The e-mails the site sends, in the language the person last used the site in. Each notify...()
// call below is made after the thing it reports has already happened, returns at once, and does
// nothing when e-mail is not switched on (Admin -> Email) or the person has no real e-mail address.

export type EmailKind =
  | "passwordReset"
  | "passwordChanged"
  | "registrationApproved"
  | "registrationRejected"
  | "documentRejected"
  | "pointsReceived"
  | "topupApproved"
  | "topupRejected"
  | "withdrawalPaid"
  | "withdrawalRejected"
  | "expenseApproved"
  | "expenseRejected"
  | "confirmEmail"
  | "registrationReminder"
  | "announcement"
  | "test";

export type EmailLocale = "en" | "ru" | "zh";
const LOCALES: readonly string[] = ["en", "ru", "zh"];

export const SITE_URL = "https://theuniqueexpo.com";

export function asLocale(value: unknown): EmailLocale {
  return typeof value === "string" && LOCALES.includes(value) ? (value as EmailLocale) : "en";
}

// The language of the page a request came from: the locale in the page address (the browser sends it
// as the Referer), else the language cookie. null when neither says.
export function detectLocale(request: Request): EmailLocale | null {
  const referer = request.headers.get("referer") || "";
  const fromPath = /^https?:\/\/[^/]+\/(en|ru|zh)(?:[/?#]|$)/.exec(referer);
  if (fromPath) return fromPath[1] as EmailLocale;
  const fromCookie = /(?:^|;\s*)NEXT_LOCALE=(en|ru|zh)(?:;|$)/.exec(request.headers.get("cookie") || "");
  return fromCookie ? (fromCookie[1] as EmailLocale) : null;
}

// Remembers the language a person is using so later e-mails (sent by an admin's action) use it.
export function rememberLocale(userId: number, locale: EmailLocale | null): void {
  if (!locale) return;
  pool
    .query("UPDATE users SET preferred_locale = ? WHERE id = ? AND (preferred_locale IS NULL OR preferred_locale <> ?)", [locale, userId, locale])
    .catch(() => {
      // Before migration 061 the column does not exist; nothing to remember yet.
    });
}

const messageCache = new Map<string, Record<string, unknown>>();
async function loadMessages(locale: EmailLocale): Promise<Record<string, unknown>> {
  let m = messageCache.get(locale);
  if (!m) {
    m = (await import(`../../../messages/${locale}.json`)).default as Record<string, unknown>;
    messageCache.set(locale, m);
  }
  return m;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

type Vars = Record<string, string | number>;

// Builds the message: greeting, intro, optional reason / balance / body, a green button and the footer.
export async function renderEmail(
  locale: EmailLocale,
  kind: EmailKind,
  name: string,
  vars: Vars,
  link: { path: string } | { url: string }
): Promise<RenderedEmail> {
  const messages = await loadMessages(locale);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = createTranslator({ locale, messages: messages as any, namespace: "emails" }) as unknown as (key: string, values?: Record<string, unknown>) => string;
  const key = (k: string) => `${kind}.${k}`;
  const has = (k: string) => {
    const section = (messages.emails as Record<string, Record<string, unknown>>)[kind];
    return typeof section?.[k] === "string";
  };
  const safe: Vars = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, escapeHtml(String(v))]));
  const url = "url" in link ? link.url : `${SITE_URL}/${locale}${link.path}`;

  // "body" can contain a nested phrase ("deadline"): build it first.
  const withDeadline = (v: Vars) => (has("deadline") && vars.date ? { ...v, deadline: t(key("deadline"), v) } : { ...v, deadline: "" });
  const paragraphsFor = (v: Vars): string[] => {
    // An announcement is the admin's own text: blank lines separate paragraphs, a line break stays a line break.
    if (kind === "announcement") {
      const html = v === htmlVars;
      return String(v.message).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => (html ? p.replace(/\n/g, "<br>") : p));
    }
    const out: string[] = [t(key("intro"), v)];
    if (has("reason") && vars.reason) out.push(t(key("reason"), v));
    if (has("balance") && vars.balance !== undefined) out.push(t(key("balance"), v));
    if (has("body")) out.push(t(key("body"), withDeadline(v)));
    if (has("ignore")) out.push(t(key("ignore"), v));
    return out;
  };
  const textVars = { minutes: 60, ...vars };
  const htmlVars = { minutes: 60, ...safe };
  const greeting = t("greeting", { name });
  const greetingHtml = t("greeting", { name: escapeHtml(name) });
  const subject = t(key("subject"), textVars);
  const button = t(key("button"), textVars);
  const signature = t("signature");
  const footer = t("footer");

  const text = [greeting, "", ...paragraphsFor(textVars).flatMap((p) => [p, ""]), `${button}: ${url}`, "", signature, "", footer].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#1c2b27">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0b3b33;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:bold">The Unique Expo</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">
<p style="margin:0 0 14px">${greetingHtml}</p>
${paragraphsFor(htmlVars).map((p) => `<p style="margin:0 0 14px">${p}</p>`).join("\n")}
<p style="margin:22px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">${escapeHtml(button)}</a></p>
<p style="margin:0;color:#4b5b56">${escapeHtml(signature)}</p>
</td></tr>
<tr><td style="padding:14px 24px;background:#f4f6f5;color:#66746f;font-size:12px;line-height:1.5">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

interface Recipient {
  id: number;
  name: string;
  email: string;
  locale: EmailLocale;
}

async function loadRecipient(userId: number): Promise<Recipient | null> {
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>("SELECT id, name, email, status, preferred_locale FROM users WHERE id = ?", [userId]);
  } catch {
    [rows] = await pool.query<RowDataPacket[]>("SELECT id, name, email, status FROM users WHERE id = ?", [userId]);
  }
  const r = rows[0];
  if (!r || r.status === "suspended" || !r.email || isPlaceholderEmail(String(r.email))) return null;
  return { id: r.id, name: String(r.name || ""), email: String(r.email), locale: asLocale(r.preferred_locale) };
}

// Sends one e-mail about something that happened to this person, in the background. Something the
// person is doing right now (asking for a reset link, changing their password) is written in the
// language of the page they are on; anything else is written in the language they last used.
export function notifyUser(
  userId: number,
  kind: EmailKind,
  vars: Vars,
  link: { path: string } | { url: string },
  requestLocale?: EmailLocale | null
): void {
  (async () => {
    if (!(await isMailEnabled())) return;
    const who = await loadRecipient(userId);
    if (!who) return;
    const nowDoing = kind === "passwordReset" || kind === "passwordChanged";
    const locale = nowDoing && requestLocale ? requestLocale : who.locale;
    const mail = await renderEmail(locale, kind, who.name, vars, link);
    sendMailInBackground({ to: who.email, kind, userId, ...mail });
  })().catch((err) => console.error("Could not prepare e-mail", kind, err));
}

// ----- the individual notifications -----

export function notifyPasswordChanged(userId: number, request: Request): void {
  notifyUser(userId, "passwordChanged", {}, { path: "/login" }, detectLocale(request));
}

export function notifyRegistrationDecision(registrationId: number, approved: boolean, confirmBy: string | null): void {
  (async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT r.user_id, e.title FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id WHERE r.id = ?",
      [registrationId]
    );
    const r = rows[0];
    if (!r) return;
    notifyUser(r.user_id, approved ? "registrationApproved" : "registrationRejected", { expo: String(r.title), ...(approved && confirmBy ? { date: confirmBy } : {}) }, { path: "/dashboard/buyer/registrations" });
  })().catch((err) => console.error("Could not prepare registration e-mail", err));
}

export function notifyPointsReceived(userId: number, points: number, reason: string, balance?: number): void {
  notifyUser(userId, "pointsReceived", { points: formatNumber(points), reason, ...(balance !== undefined ? { balance: formatNumber(balance) } : {}) }, { path: "/dashboard/buyer/wallet" });
}

export function notifyWalletRequest(
  table: "wallet_topups" | "wallet_withdrawals" | "wallet_expense_claims",
  id: number,
  kind: "topupApproved" | "topupRejected" | "withdrawalPaid" | "withdrawalRejected" | "expenseApproved" | "expenseRejected",
  vars: { points?: number; reason?: string }
): void {
  (async () => {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    const r = rows[0];
    if (!r) return;
    const points = vars.points ?? (table === "wallet_withdrawals" ? Number(r.points) : undefined);
    notifyUser(
      r.user_id,
      kind,
      { ...(points !== undefined ? { points: formatNumber(points) } : {}), ...(vars.reason ? { reason: vars.reason } : {}) },
      { path: "/dashboard/buyer/wallet" }
    );
  })().catch((err) => console.error("Could not prepare wallet e-mail", kind, err));
}

// A rejected document: the document's name is written in the person's own language.
export function notifyDocumentRejected(userId: number, documentKey: string, reason: string): void {
  (async () => {
    if (!(await isMailEnabled())) return;
    const who = await loadRecipient(userId);
    if (!who) return;
    const item = (await getFormItems()).find((i) => i.key === documentKey);
    const document = item ? item.labels[who.locale] || item.labels.en : documentKey;
    const mail = await renderEmail(who.locale, "documentRejected", who.name, { document, reason }, { path: "/dashboard/buyer/profile" });
    sendMailInBackground({ to: who.email, kind: "documentRejected", userId, ...mail });
  })().catch((err) => console.error("Could not prepare document e-mail", err));
}

// Awaited by the admin "send a test" button, so the admin sees the real result.
export async function sendTestEmail(to: string, locale: EmailLocale, name: string): Promise<{ ok: boolean; error?: string }> {
  const mail = await renderEmail(locale, "test", name, {}, { url: SITE_URL });
  return sendMail({ to, kind: "test", ...mail }, { ignoreEnabled: true });
}

// ----- announcements from an admin -----

export interface AnnouncementTexts {
  subject: Record<EmailLocale, string>;
  message: Record<EmailLocale, string>;
}

export interface AnnouncementResult {
  queued: number;
  withoutEmail: number;
}

// Sends one announcement to the chosen people, each in their own language (English when the admin did not
// write that language). People without a real e-mail address are skipped. The sending runs in the
// background, one message at a time with a short pause, so a long list does not hammer the mail server.
export async function sendAnnouncement(userIds: number[], texts: AnnouncementTexts): Promise<AnnouncementResult> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, status, preferred_locale FROM users WHERE id IN (?) AND role = 'buyer'",
    [userIds]
  ).catch(async () => pool.query<RowDataPacket[]>("SELECT id, name, email, status FROM users WHERE id IN (?) AND role = 'buyer'", [userIds]));
  const people = rows.filter((r) => r.status !== "suspended" && r.email && !isPlaceholderEmail(String(r.email)));
  const withoutEmail = userIds.length - people.length;
  (async () => {
    for (const r of people) {
      const wanted = asLocale(r.preferred_locale);
      const locale: EmailLocale = texts.message[wanted]?.trim() && texts.subject[wanted]?.trim() ? wanted : "en";
      try {
        const mail = await renderEmail(locale, "announcement", String(r.name || ""), { subject: texts.subject[locale], message: texts.message[locale] }, { url: SITE_URL });
        await sendMail({ to: String(r.email), kind: "announcement", userId: r.id, ...mail });
      } catch (err) {
        console.error("Announcement e-mail failed for user", r.id, err);
      }
      await new Promise((res) => setTimeout(res, 150));
    }
  })().catch((err) => console.error("Announcement run failed:", err));
  return { queued: people.length, withoutEmail };
}
