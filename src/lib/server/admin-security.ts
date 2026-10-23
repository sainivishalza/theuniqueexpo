import { createHash } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getClientIp } from "@/lib/server/rate-limit";

// Two things about how admins sign in:
//  1. An optional rule that EVERY admin must use two-step sign-in. While it is on, an admin without two-step can sign in but can
//     only open their account page (to set it up); every other admin request is refused (see requireAdmin).
//  2. A record of the browsers and places each admin signed in from. A sign-in from one not seen before is e-mailed to that admin.
//
// This file does not import the two-step module or the mailer at load time (they import the auth module, which imports this
// one, and a loop would leave the mailer without the site secret); it asks the table directly and loads the mailer only when it sends.

const CACHE_MS = 10_000;
const ALERT_EVERY_MS = 60 * 60_000;

function missing(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR";
}

// ----- the rule -----

let settingCache: { at: number; value: boolean } | null = null;
const userCache = new Map<number, { at: number; hasTwoStep: boolean }>();

export function forgetSecurityCaches(): void {
  settingCache = null;
  userCache.clear();
}

export async function getRequireTwoStep(): Promise<boolean | null> {
  if (settingCache && Date.now() - settingCache.at < CACHE_MS) return settingCache.value;
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT require_two_step FROM admin_security_settings WHERE id = 1");
    const value = !!rows[0]?.require_two_step;
    settingCache = { at: Date.now(), value };
    return value;
  } catch (err) {
    if (missing(err)) return null;
    throw err;
  }
}

export async function setRequireTwoStep(value: boolean, adminId: number): Promise<boolean> {
  try {
    await pool.query("INSERT INTO admin_security_settings (id, require_two_step, updated_by) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE require_two_step = VALUES(require_two_step), updated_by = VALUES(updated_by)", [value ? 1 : 0, adminId]);
    forgetSecurityCaches();
    return true;
  } catch (err) {
    if (missing(err)) return false;
    throw err;
  }
}

export async function hasTwoStep(userId: number): Promise<boolean> {
  const hit = userCache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.hasTwoStep;
  let on = false;
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT 1 FROM admin_totp WHERE user_id = ? AND enabled = 1", [userId]);
    on = rows.length > 0;
  } catch (err) {
    if (!missing(err)) throw err;
  }
  userCache.set(userId, { at: Date.now(), hasTwoStep: on });
  return on;
}

/** True when the rule is on and this admin has not set two-step up yet. */
export async function mustSetUpTwoStep(userId: number): Promise<boolean> {
  if (!(await getRequireTwoStep())) return false;
  return !(await hasTwoStep(userId));
}

/** The only admin API an admin without two-step may still use while the rule is on (the screen that sets it up). */
export function isTwoStepSetupPath(pathname: string): boolean {
  return pathname === "/api/admin/two-step" || pathname.startsWith("/api/admin/two-step/");
}

/** Active admins who have not set two-step up (so the admin turning the rule on knows who will be asked to). */
export async function adminsWithoutTwoStep(): Promise<number> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM users u WHERE u.role = 'admin' AND u.status <> 'suspended' AND NOT EXISTS (SELECT 1 FROM admin_totp t WHERE t.user_id = u.id AND t.enabled = 1)");
    return Number(rows[0]?.n ?? 0);
  } catch (err) {
    if (missing(err)) return 0;
    throw err;
  }
}

// ----- where admins sign in from -----

/** The first part of an address (the first 3 numbers of an IPv4 address, the first 4 groups of an IPv6 one), so a changing
 *  last number (a phone moving between towers) does not look like a new place. */
export function ipPrefix(ip: string): string {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip.split(".").slice(0, 3).join(".") + ".x";
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + ":x";
  return ip.slice(0, 40);
}

/** A short, readable name for a browser and system, from the User-Agent text. */
export function browserName(userAgent: string): string {
  const ua = userAgent || "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
  const system = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "an unknown system";
  return `${browser} on ${system}`;
}

export interface SignInDevice {
  browser: string;
  ipPrefix: string;
  firstAt: string;
  lastAt: string;
  signIns: number;
}

const iso = (v: unknown) => new Date(String(v).replace(" ", "T") + "Z").toISOString();

export async function listDevices(userId: number, limit = 10): Promise<SignInDevice[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT browser, ip_prefix, first_at, last_at, sign_ins FROM admin_login_devices WHERE user_id = ? ORDER BY last_at DESC LIMIT ?", [userId, limit]);
    return rows.map((r) => ({ browser: String(r.browser), ipPrefix: String(r.ip_prefix), firstAt: iso(r.first_at), lastAt: iso(r.last_at), signIns: Number(r.sign_ins) }));
  } catch (err) {
    if (missing(err)) return [];
    throw err;
  }
}

/**
 * Called after an admin signed in. Writes the browser and place down; when it is new (and the admin has signed in from somewhere
 * else before) the admin gets an e-mail about it, at most one an hour. Never throws and never slows the sign-in down.
 */
export function noteAdminSignIn(request: Request, user: { id: number; name: string; email: string }): void {
  void recordSignIn(request, user).catch((err) => console.error("Could not record the admin sign-in:", err));
}

async function recordSignIn(request: Request, user: { id: number; name: string; email: string }): Promise<void> {
  const prefix = ipPrefix(getClientIp(request));
  const browser = browserName(request.headers.get("user-agent") ?? "");
  const fingerprint = createHash("sha256").update(`${prefix}|${browser}`).digest("hex");
  let known: RowDataPacket[];
  let others: number;
  try {
    [known] = await pool.query<RowDataPacket[]>("SELECT id FROM admin_login_devices WHERE user_id = ? AND fingerprint = ?", [user.id, fingerprint]);
    const [count] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM admin_login_devices WHERE user_id = ?", [user.id]);
    others = Number(count[0]?.n ?? 0);
  } catch (err) {
    if (missing(err)) return;
    throw err;
  }
  if (known[0]) {
    await pool.query("UPDATE admin_login_devices SET last_at = UTC_TIMESTAMP(), sign_ins = sign_ins + 1 WHERE id = ?", [known[0].id]);
    return;
  }
  await pool.query("INSERT IGNORE INTO admin_login_devices (user_id, fingerprint, ip_prefix, browser, first_at, last_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())", [user.id, fingerprint, prefix, browser]);
  // The very first sign-in the site ever sees for this admin is only written down (there is nothing to compare it with).
  if (others === 0) return;
  const [claim] = await pool.query<ResultSetHeader>(
    "UPDATE admin_login_devices SET alerted_at = UTC_TIMESTAMP() WHERE user_id = ? AND fingerprint = ? AND NOT EXISTS (SELECT 1 FROM (SELECT 1 FROM admin_login_devices WHERE user_id = ? AND alerted_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)) recent)",
    [user.id, fingerprint, user.id, Math.floor(ALERT_EVERY_MS / 1000)]
  );
  if (claim.affectedRows !== 1) return;
  const when = new Date().toISOString().slice(0, 16).replace("T", " ");
  const text = `Someone signed in to your admin account on The Unique Expo.\n\nWhen: ${when} UTC\nFrom: ${browser}, network ${prefix}\n\nIf this was you, you can ignore this message.\nIf it was not you, change your password now (Admin → My account), turn on two-step sign-in there, and tell another admin.\n\nThe Unique Expo`;
  const html = `<p>Someone signed in to your admin account on The Unique Expo.</p><ul><li>When: ${when} UTC</li><li>From: ${browser.replace(/[<>&"]/g, "")}, network ${prefix.replace(/[<>&"]/g, "")}</li></ul><p>If this was you, you can ignore this message.</p><p><strong>If it was not you</strong>, change your password now (Admin → My account), turn on two-step sign-in there, and tell another admin.</p><p>The Unique Expo</p>`;
  const { sendMail } = await import("@/lib/server/mail");
  await sendMail({ to: user.email, userId: user.id, kind: "adminSignIn", subject: "New sign-in to your admin account", text, html });
}
