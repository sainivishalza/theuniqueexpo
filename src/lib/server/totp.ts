import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { JWT_SECRET } from "@/lib/auth-server";
import { decryptSecret, encryptSecret } from "@/lib/server/mail";

// Admin two-step sign-in: a 6-digit code from an authenticator app (RFC 6238: HMAC-SHA1, 30 s, 6 digits),
// plus ten single-use recovery codes for a lost phone. Only admins can switch it on.

const STEP_SECONDS = 30;
const DIGITS = 6;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const RECOVERY_COUNT = 10;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpAt(secret: Buffer, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", secret).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  const code = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function currentStep(nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

/** The step the code belongs to (this one, or one either side for a slow clock), or null. */
export function matchingStep(secret: Buffer, code: string, nowMs = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const now = currentStep(nowMs);
  for (const step of [now, now - 1, now + 1]) {
    const expected = Buffer.from(totpAt(secret, step));
    if (timingSafeEqual(expected, Buffer.from(code))) return step;
  }
  return null;
}

export function otpauthUri(secretBase32: string, account: string): string {
  const label = encodeURIComponent(`The Unique Expo:${account}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent("The Unique Expo")}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

// ----- recovery codes -----

function hashRecovery(code: string): string {
  return createHash("sha256").update(code.replace(/[^a-z0-9]/gi, "").toLowerCase()).digest("hex");
}

function newRecoveryCodes(): string[] {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: RECOVERY_COUNT }, () => {
    const bytes = randomBytes(10);
    const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

// ----- storage -----

interface TotpRow {
  secret: Buffer;
  enabled: boolean;
  lastStep: number;
  recovery: string[];
}

async function readRow(userId: number): Promise<TotpRow | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT secret_enc, enabled, last_step, recovery_hashes FROM admin_totp WHERE user_id = ?",
      [userId]
    );
    const r = rows[0];
    if (!r) return null;
    const plain = decryptSecret(String(r.secret_enc));
    if (!plain) return null;
    let recovery: string[] = [];
    try {
      const parsed = JSON.parse(String(r.recovery_hashes ?? "[]"));
      if (Array.isArray(parsed)) recovery = parsed.filter((x) => typeof x === "string");
    } catch {}
    return { secret: base32Decode(plain), enabled: !!r.enabled, lastStep: Number(r.last_step), recovery };
  } catch (err) {
    // The table does not exist until migration 063 has run: nobody has two-step yet.
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return null;
    throw err;
  }
}

export async function isTwoStepOn(userId: number): Promise<boolean> {
  return (await readRow(userId))?.enabled === true;
}

/** Which of these accounts have two-step switched on (for the Users list). */
export async function twoStepUserIds(): Promise<Set<number>> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT user_id FROM admin_totp WHERE enabled = 1");
    return new Set(rows.map((r) => Number(r.user_id)));
  } catch {
    return new Set();
  }
}

/** Starts (or restarts) set-up: a new secret that does nothing until a code from it is confirmed. */
export async function beginSetup(userId: number, account: string): Promise<{ secret: string; uri: string } | null> {
  if (await isTwoStepOn(userId)) return null;
  const secret = base32Encode(randomBytes(20));
  await pool.query(
    `INSERT INTO admin_totp (user_id, secret_enc, enabled, last_step, recovery_hashes)
     VALUES (?, ?, 0, 0, NULL)
     ON DUPLICATE KEY UPDATE secret_enc = VALUES(secret_enc), enabled = 0, last_step = 0, recovery_hashes = NULL`,
    [userId, encryptSecret(secret)]
  );
  return { secret, uri: otpauthUri(secret, account) };
}

/** Confirms set-up with a first code. Returns the recovery codes (shown once), or null for a wrong code. */
export async function confirmSetup(userId: number, code: string): Promise<string[] | null> {
  const row = await readRow(userId);
  if (!row || row.enabled) return null;
  const step = matchingStep(row.secret, code);
  if (step === null) return null;
  const codes = newRecoveryCodes();
  await pool.query(
    "UPDATE admin_totp SET enabled = 1, enabled_at = NOW(), last_step = ?, recovery_hashes = ? WHERE user_id = ?",
    [step, JSON.stringify(codes.map(hashRecovery)), userId]
  );
  return codes;
}

export async function regenerateRecoveryCodes(userId: number): Promise<string[] | null> {
  const row = await readRow(userId);
  if (!row?.enabled) return null;
  const codes = newRecoveryCodes();
  await pool.query("UPDATE admin_totp SET recovery_hashes = ? WHERE user_id = ?", [JSON.stringify(codes.map(hashRecovery)), userId]);
  return codes;
}

export async function recoveryCodesLeft(userId: number): Promise<number> {
  return (await readRow(userId))?.recovery.length ?? 0;
}

export async function disableTwoStep(userId: number): Promise<void> {
  try {
    await pool.query("DELETE FROM admin_totp WHERE user_id = ?", [userId]);
  } catch (err) {
    if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") throw err;
  }
}

/**
 * Checks the second step: a 6-digit app code (each code works once: a step already used is refused,
 * so a code seen over someone's shoulder cannot be replayed) or a recovery code (used up on success).
 */
export async function verifySecondStep(userId: number, input: string): Promise<"ok" | "recovery" | "wrong"> {
  const row = await readRow(userId);
  if (!row?.enabled) return "wrong";
  const text = input.replace(/\s+/g, "");
  if (/^\d{6}$/.test(text)) {
    const step = matchingStep(row.secret, text);
    if (step === null) return "wrong";
    // Atomic: only the request that moves last_step forward wins.
    const [res] = await pool.query<import("mysql2/promise").ResultSetHeader>(
      "UPDATE admin_totp SET last_step = ? WHERE user_id = ? AND last_step < ?",
      [step, userId, step]
    );
    return res.affectedRows === 1 ? "ok" : "wrong";
  }
  const hash = hashRecovery(text);
  if (text.replace(/[^a-z0-9]/gi, "").length !== 10 || !row.recovery.includes(hash)) return "wrong";
  const left = row.recovery.filter((h) => h !== hash);
  const [res] = await pool.query<import("mysql2/promise").ResultSetHeader>(
    "UPDATE admin_totp SET recovery_hashes = ? WHERE user_id = ? AND recovery_hashes = ?",
    [JSON.stringify(left), userId, JSON.stringify(row.recovery)]
  );
  return res.affectedRows === 1 ? "recovery" : "wrong";
}

// ----- the short-lived pass between the password step and the code step -----

const CHALLENGE_PURPOSE = "admin-second-step";
// A different key from the sign-in cookie's, so this pass can never be accepted as a session.
const CHALLENGE_KEY = createHash("sha256").update(`second-step:${JWT_SECRET}`).digest();

export function signChallenge(userId: number): string {
  return jwt.sign({ id: userId, purpose: CHALLENGE_PURPOSE }, CHALLENGE_KEY, { expiresIn: "5m" });
}

export function readChallenge(token: unknown): number | null {
  if (typeof token !== "string") return null;
  try {
    const d = jwt.verify(token, CHALLENGE_KEY) as { id?: number; purpose?: string };
    return d.purpose === CHALLENGE_PURPOSE && typeof d.id === "number" ? d.id : null;
  } catch {
    return null;
  }
}
