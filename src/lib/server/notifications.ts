import { createTranslator } from "next-intl";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/login-id";
import { formatNumber } from "@/lib/format";
import { isMailEnabled, sendMail, sendMailInBackground } from "@/lib/server/mail";
import { getFormItems } from "@/lib/server/buyer-form-repo";
import { fillFields, usesFields } from "@/lib/announcement-fields";
import { loadPersonFields, valuesFor } from "@/lib/server/announcement-people";
import { allowsEmail, preferenceForKind, unsubscribeQuery, type MailPreference } from "@/lib/server/mail-preferences";
import { addNotification, addNotificationForMany, addPersonalNotifications, NOTIFICATION_KINDS, type NotificationKind } from "@/lib/server/user-notifications";

// The e-mails the site sends, in the language the person last used the site in. Each notify...()
// call below is made after the thing it reports has already happened, returns at once, and does
// nothing when e-mail is not switched on (Admin -> Email) or the person has no real e-mail address.

export type EmailKind =
  | "passwordReset"
  | "passwordChanged"
  | "registrationReceived"
  | "registrationWaitlisted"
  | "waitlistPlaceOpened"
  | "registrationApproved"
  | "registrationRejected"
  | "tourRegistrationApproved"
  | "tourRegistrationRejected"
  | "documentRejected"
  | "pointsReceived"
  | "topupApproved"
  | "topupRejected"
  | "withdrawalPaid"
  | "withdrawalRejected"
  | "expenseApproved"
  | "expenseRejected"
  | "confirmEmail"
  | "confirmEmailChange"
  | "emailChanged"
  | "registrationReminder"
  | "registrationStartsSoon"
  | "savedRegistrationOpened"
  | "savedRegistrationClosing"
  | "passportExpiring"
  | "visaExpiring"
  | "groupInvite"
  | "announcement"
  | "test";

export type EmailLocale = "en" | "ru" | "zh";
const LOCALE_LIST: EmailLocale[] = ["en", "ru", "zh"];
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

async function emailTranslator(locale: EmailLocale) {
  const messages = await loadMessages(locale);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createTranslator({ locale, messages: messages as any, namespace: "emails" }) as unknown as (key: string, values?: Record<string, unknown>) => string;
}

export interface UnsubscribeParts {
  text: string;
  html: string;
  headers: Record<string, string>;
}

// The line under an optional e-mail that turns it off in one step (a page that asks first, so a mail scanner opening the
// link does not unsubscribe anyone), and the headers that let mail programs offer "Unsubscribe" themselves.
export async function unsubscribeParts(locale: EmailLocale, pref: MailPreference, userId: number): Promise<UnsubscribeParts> {
  const t = await emailTranslator(locale);
  const query = unsubscribeQuery(userId, pref);
  const pageUrl = `${SITE_URL}/${locale}/unsubscribe?${query}`;
  const line = t(`unsubscribe.${pref}`, { url: pageUrl });
  const htmlLine = escapeHtml(t(`unsubscribe.${pref}`, { url: "%%URL%%" })).replace("%%URL%%", `<a href="${escapeHtml(pageUrl)}" style="color:#0f766e">${escapeHtml(t("unsubscribe.link"))}</a>`);
  return {
    text: line,
    html: `<p style="margin:0;padding:12px 24px;color:#66746f;font-size:12px;line-height:1.5;text-align:center;font-family:Arial,Helvetica,sans-serif">${htmlLine}</p>`,
    headers: { "List-Unsubscribe": `<${SITE_URL}/api/unsubscribe?${query}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

export interface DigestItem {
  title: string;
  dates: string;
  city: string;
  url: string;
}

// "New exhibitions this week" for one person, in their language.
export async function renderDigestEmail(locale: EmailLocale, name: string, items: DigestItem[], userId: number): Promise<RenderedEmail & { headers: Record<string, string> }> {
  const t = await emailTranslator(locale);
  const unsub = await unsubscribeParts(locale, "digest", userId);
  const count = items.length;
  const line = (i: DigestItem) => t("digest.item", { title: i.title, dates: i.dates, city: i.city });
  const buttonUrl = `${SITE_URL}/${locale}/exhibitions`;
  const subject = t("digest.subject", { count });
  const intro = t("digest.intro", { count });
  const text = [t("greeting", { name }), "", intro, "", ...items.flatMap((i) => [`- ${line(i)}`, `  ${i.url}`]), "", `${t("digest.button")}: ${buttonUrl}`, "", t("signature"), "", unsub.text, "", t("footer")].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#1c2b27">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0b3b33;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:bold">The Unique Expo</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">
<p style="margin:0 0 14px">${escapeHtml(t("greeting", { name }))}</p>
<p style="margin:0 0 14px">${escapeHtml(intro)}</p>
<ul style="margin:0 0 14px;padding-left:20px">${items.map((i) => `<li style="margin:0 0 8px"><a href="${escapeHtml(i.url)}" style="color:#0f766e;font-weight:bold">${escapeHtml(i.title)}</a><br><span style="color:#4b5b56">${escapeHtml(i.dates)}, ${escapeHtml(i.city)}</span></li>`).join("")}</ul>
<p style="margin:22px 0"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">${escapeHtml(t("digest.button"))}</a></p>
<p style="margin:0;color:#4b5b56">${escapeHtml(t("signature"))}</p>
</td></tr>
<tr><td style="padding:14px 24px;background:#f4f6f5;color:#66746f;font-size:12px;line-height:1.5">${escapeHtml(t("footer"))}</td></tr>
</table>${unsub.html}</td></tr></table></body></html>`;
  return { subject, text, html, headers: unsub.headers };
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
  // The same news is kept on the website for the person, whether or not e-mail is on or they have an address.
  if ("path" in link && NOTIFICATION_KINDS.includes(kind)) addNotification(userId, kind as NotificationKind, vars, link.path);
  (async () => {
    if (!(await isMailEnabled())) return;
    const who = await loadRecipient(userId);
    if (!who) return;
    // Alerts about saved exhibitions can be turned off (they stay on the website either way).
    if (!(await allowsEmail(userId, kind))) return;
    const nowDoing = kind === "passwordReset" || kind === "passwordChanged";
    const locale = nowDoing && requestLocale ? requestLocale : who.locale;
    const mail = await renderEmail(locale, kind, who.name, vars, link);
    // An optional e-mail ends with the link that turns it off.
    const pref = preferenceForKind(kind);
    if (pref) {
      const unsub = await unsubscribeParts(locale, pref, userId);
      sendMailInBackground({ to: who.email, kind, userId, subject: mail.subject, text: `${mail.text}\n\n${unsub.text}`, html: mail.html.replace("</body>", `${unsub.html}</body>`), headers: unsub.headers });
      return;
    }
    sendMailInBackground({ to: who.email, kind, userId, ...mail });
  })().catch((err) => console.error("Could not prepare e-mail", kind, err));
}

// ----- the individual notifications -----

export function notifyPasswordChanged(userId: number, request: Request): void {
  notifyUser(userId, "passwordChanged", {}, { path: "/login" }, detectLocale(request));
}

// "Your registration was received": one message for everything a buyer registered for in one go. The names are
// kept short (the website copy has a size limit): the first few, then how many more.
export function notifyRegistrationsReceived(userId: number, titles: string[]): void {
  const names = titles.map((t) => t.trim()).filter(Boolean);
  if (names.length === 0) return;
  const SHOWN = 8;
  const expo = names.length > SHOWN ? `${names.slice(0, SHOWN).join(", ")} (+${names.length - SHOWN})` : names.join(", ");
  notifyUser(userId, "registrationReceived", { expo }, { path: "/dashboard/buyer/registrations" });
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

// A tour registration decided by an admin: the buyer is told on the website and (when e-mail is on) by e-mail.
export function notifyTourRegistrationDecision(registrationId: number, approved: boolean): void {
  (async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT r.user_id, t.title, t.slug FROM tour_registrations r JOIN tours t ON t.id = r.tour_id WHERE r.id = ?",
      [registrationId]
    );
    const r = rows[0];
    if (!r) return;
    notifyUser(r.user_id, approved ? "tourRegistrationApproved" : "tourRegistrationRejected", { tour: String(r.title) }, { path: `/tours/${String(r.slug)}` });
  })().catch((err) => console.error("Could not prepare tour registration notice", err));
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
  // On the website the document's name is shown in the language of whoever reads it.
  getFormItems()
    .then((items) => {
      const item = items.find((i) => i.key === documentKey);
      addNotification(userId, "documentRejected", { document: item ? { en: item.labels.en, ru: item.labels.ru || item.labels.en, zh: item.labels.zh || item.labels.en } : documentKey, reason }, "/dashboard/buyer/profile");
    })
    .catch((err) => console.error("Could not save the document notification", err));
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
  /** E-mails being sent. */
  queued: number;
  /** Selected buyers who get no e-mail (no real address, or e-mail is off). */
  withoutEmail: number;
  /** Buyers who can read it under Notifications on the website. */
  notified: number;
  mailOn: boolean;
}

// Publishes one announcement to the chosen people on the website and (when e-mail is on) e-mails it, each in their own language (English when the admin did not
// write that language). People without a real e-mail address are skipped. The sending runs in the
// background, one message at a time with a short pause, so a long list does not hammer the mail server.
export async function sendAnnouncement(userIds: number[], texts: AnnouncementTexts): Promise<AnnouncementResult> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, status, preferred_locale FROM users WHERE id IN (?) AND role = 'buyer'",
    [userIds]
  ).catch(async () => pool.query<RowDataPacket[]>("SELECT id, name, email, status FROM users WHERE id IN (?) AND role = 'buyer'", [userIds]));
  // Everyone selected can read it on the website, with or without an e-mail address (and with e-mail switched off).
  const readers = rows.filter((r) => r.status !== "suspended").map((r) => Number(r.id));
  // Texts with {name}, {number} or {exhibition} are written separately for each reader; others are saved in one go.
  const personal = LOCALE_LIST.some((l) => usesFields(texts.subject[l]) || usesFields(texts.message[l]));
  const fields = personal ? await loadPersonFields(userIds) : null;
  const fill = (id: number, locale: EmailLocale, text: string) => {
    const person = fields?.get(id);
    return person ? fillFields(text, valuesFor(person, locale)) : text;
  };
  if (personal) {
    await addPersonalNotifications(
      readers.map((id) => ({
        userId: id,
        params: {
          subject: { en: fill(id, "en", texts.subject.en), ru: fill(id, "ru", texts.subject.ru), zh: fill(id, "zh", texts.subject.zh) },
          message: { en: fill(id, "en", texts.message.en), ru: fill(id, "ru", texts.message.ru), zh: fill(id, "zh", texts.message.zh) },
        },
      })),
      "announcement",
      "/dashboard/notifications"
    );
  } else {
    await addNotificationForMany(readers, "announcement", { subject: texts.subject, message: texts.message }, "/dashboard/notifications");
  }
  const mailOn = await isMailEnabled();
  const people = mailOn ? rows.filter((r) => r.status !== "suspended" && r.email && !isPlaceholderEmail(String(r.email))) : [];
  const withoutEmail = userIds.length - people.length;
  (async () => {
    for (const r of people) {
      const wanted = asLocale(r.preferred_locale);
      const locale: EmailLocale = texts.message[wanted]?.trim() && texts.subject[wanted]?.trim() ? wanted : "en";
      try {
        const mail = await renderEmail(locale, "announcement", String(r.name || ""), { subject: fill(Number(r.id), locale, texts.subject[locale]), message: fill(Number(r.id), locale, texts.message[locale]) }, { url: SITE_URL });
        await sendMail({ to: String(r.email), kind: "announcement", userId: r.id, ...mail });
      } catch (err) {
        console.error("Announcement e-mail failed for user", r.id, err);
      }
      await new Promise((res) => setTimeout(res, 150));
    }
  })().catch((err) => console.error("Announcement run failed:", err));
  return { queued: people.length, withoutEmail, notified: readers.length, mailOn };
}
