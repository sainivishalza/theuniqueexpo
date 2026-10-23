import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { JWT_SECRET } from "@/lib/auth-server";
import { isSuppressed } from "@/lib/server/email-bounces";

// Sending e-mail. The settings (mail server, user name, password, sender address) are filled in by an
// admin on Admin -> Email and kept in the mail_settings table, the password encrypted. Nothing is sent
// until an admin switches e-mail on; every screen that depends on e-mail checks isMailEnabled() first.

export interface MailSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  hasPassword: boolean;
  fromName: string;
  fromEmail: string;
}

const DEFAULTS: MailSettings = { enabled: false, host: "", port: 587, secure: false, username: "", hasPassword: false, fromName: "The Unique Expo", fromEmail: "" };

// ----- the saved password: AES-256-GCM, key derived from the site secret -----

const KEY = createHash("sha256").update(`mail-settings:${JWT_SECRET}`).digest();

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decryptSecret(encoded: string): string | null {
  try {
    const raw = Buffer.from(encoded, "base64");
    const decipher = createDecipheriv("aes-256-gcm", KEY, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ----- settings -----

interface StoredSettings extends MailSettings {
  password: string;
}

let cache: { at: number; value: StoredSettings } | null = null;
const CACHE_MS = 20_000;

export function forgetMailSettings(): void {
  cache = null;
}

async function readSettings(): Promise<StoredSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  let value: StoredSettings = { ...DEFAULTS, password: "" };
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM mail_settings WHERE id = 1");
    const r = rows[0];
    if (r) {
      const password = r.password_enc ? decryptSecret(String(r.password_enc)) ?? "" : "";
      value = {
        enabled: !!r.enabled,
        host: String(r.host),
        port: Number(r.port),
        secure: !!r.secure,
        username: String(r.username),
        hasPassword: !!r.password_enc,
        fromName: String(r.from_name),
        fromEmail: String(r.from_email),
        password,
      };
    }
  } catch {
    // The table does not exist yet (a deploy in progress): e-mail is simply off.
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function getMailSettings(): Promise<MailSettings> {
  const { password: _password, ...rest } = await readSettings();
  void _password;
  return rest;
}

export async function isMailEnabled(): Promise<boolean> {
  const s = await readSettings();
  return s.enabled && s.host !== "" && s.fromEmail !== "";
}

export interface MailSettingsInput {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  /** undefined keeps the saved password; "" removes it. */
  password?: string;
  fromName: string;
  fromEmail: string;
}

export const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const HOST_RE = /^[A-Za-z0-9]([A-Za-z0-9.-]{0,198}[A-Za-z0-9])?$/;

/** Returns a short error code, or null when the input is fine. */
export function validateMailSettings(input: MailSettingsInput): string | null {
  if (input.host && !HOST_RE.test(input.host)) return "invalid_host";
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) return "invalid_port";
  if (input.fromEmail && !EMAIL_RE.test(input.fromEmail)) return "invalid_from";
  if (input.fromName.length > 120 || /[\r\n]/.test(input.fromName)) return "invalid_from";
  if (input.username.length > 200 || (input.password ?? "").length > 500) return "invalid_input";
  if (input.enabled && (!input.host || !input.fromEmail)) return "incomplete";
  return null;
}

export async function saveMailSettings(input: MailSettingsInput): Promise<void> {
  const passwordEnc = input.password === undefined ? null : input.password === "" ? "" : encryptSecret(input.password);
  await pool.query<ResultSetHeader>(
    `INSERT INTO mail_settings (id, enabled, host, port, secure, username, password_enc, from_name, from_email)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), host = VALUES(host), port = VALUES(port), secure = VALUES(secure),
       username = VALUES(username), password_enc = ${input.password === undefined ? "password_enc" : "VALUES(password_enc)"},
       from_name = VALUES(from_name), from_email = VALUES(from_email)`,
    [input.enabled ? 1 : 0, input.host.trim(), input.port, input.secure ? 1 : 0, input.username.trim(), passwordEnc ?? "", input.fromName.trim(), input.fromEmail.trim()]
  );
  forgetMailSettings();
}

// ----- sending -----

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
  kind: string;
  userId?: number | null;
  /** Files to attach (the scheduled Excel reports). */
  attachments?: { filename: string; content: Buffer; contentType: string }[];
  /** Extra message headers (List-Unsubscribe on the optional e-mails). */
  headers?: Record<string, string>;
}

function shortError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; message?: string };
  const message = String(e?.message ?? err).replace(/\s+/g, " ");
  return `${e?.code ? `${e.code}: ` : ""}${message}`.slice(0, 280);
}

async function logMail(mail: OutgoingMail, status: "sent" | "failed", error = ""): Promise<void> {
  try {
    await pool.query(
      "INSERT INTO email_log (user_id, to_email, kind, subject, status, error) VALUES (?, ?, ?, ?, ?, ?)",
      [mail.userId ?? null, mail.to.slice(0, 254), mail.kind, mail.subject.slice(0, 250), status, error]
    );
    // Keep the log short: nothing older than 60 days.
    if (Math.random() < 0.02) await pool.query("DELETE FROM email_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 60 DAY)");
  } catch {
    // The log is for the admin's information only; never let it break a send.
  }
}

// Mails that are still tried for an address that bounced: the person may have fixed the problem, and they cannot sign in without them.
const ALWAYS_SENT_KINDS = new Set(["passwordReset", "passwordChanged", "confirmEmail", "confirmEmailChange", "emailChanged", "test"]);

// Sends one message with the saved settings. Never throws: the result says what happened.
export async function sendMail(mail: OutgoingMail, options: { ignoreEnabled?: boolean } = {}): Promise<{ ok: boolean; error?: string }> {
  const s = await readSettings();
  if (!options.ignoreEnabled && !(s.enabled && s.host && s.fromEmail)) return { ok: false, error: "disabled" };
  if (!s.host || !s.fromEmail) return { ok: false, error: "incomplete" };
  if (!EMAIL_RE.test(mail.to) || /[\r\n]/.test(mail.subject)) return { ok: false, error: "invalid_recipient" };
  // An address that bounced for good is not e-mailed again (until an admin clears it), except the mails a person needs
  // to sign in or confirm an address, and the admin's own test.
  if (!ALWAYS_SENT_KINDS.has(mail.kind) && (await isSuppressed(mail.to).catch(() => false))) return { ok: false, error: "bounced" };
  try {
    const transport = nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: s.secure,
      auth: s.username ? { user: s.username, pass: s.password } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    await transport.sendMail({
      from: { name: s.fromName, address: s.fromEmail },
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: mail.attachments,
      headers: mail.headers,
    });
    await logMail(mail, "sent");
    return { ok: true };
  } catch (err) {
    const error = shortError(err);
    await logMail(mail, "failed", error);
    return { ok: false, error };
  }
}

// For notifications: sends in the background and only logs a failure, so what the admin was doing
// (approving a registration, paying a withdrawal) never waits for the mail server or fails because of it.
export function sendMailInBackground(mail: OutgoingMail): void {
  sendMail(mail).catch((err) => console.error("Background e-mail failed:", shortError(err)));
}

export interface MailLogRow {
  id: number;
  toEmail: string;
  kind: string;
  subject: string;
  status: "sent" | "failed";
  error: string;
  createdAt: string;
}

export async function listMailLog(limit = 50): Promise<MailLogRow[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, to_email, kind, subject, status, error, created_at FROM email_log ORDER BY id DESC LIMIT ?",
      [limit]
    );
    return rows.map((r) => ({
      id: r.id,
      toEmail: r.to_email,
      kind: r.kind,
      subject: r.subject,
      status: r.status,
      error: r.error,
      createdAt: String(r.created_at),
    }));
  } catch {
    return [];
  }
}
