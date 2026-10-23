import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { NextResponse } from "next/server";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { normalizeLoginPhone, normalizePassportNumber } from "@/lib/login-id";
import { canCallAdminApi } from "@/lib/staff-access";
import { getStaffPreset } from "@/lib/server/staff-access";
import { isTwoStepSetupPath, mustSetUpTwoStep } from "@/lib/server/admin-security";
import { assignBuyerNumberQuietly } from "@/lib/server/buyer-numbers";

const envSecret = process.env.JWT_SECRET;
if (!envSecret) {
  throw new Error("JWT_SECRET environment variable must be set");
}
export const JWT_SECRET = envSecret;

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
  country: string;
}

interface SessionTokenPayload {
  id: number;
  email: string;
  role: string;
  iat?: number;
}

export function signSessionToken(user: Pick<SessionUser, "id" | "email" | "role">): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
}

// Shared by /api/auth/register and any flow that needs to create an account
// inline (e.g. expo registration without a prior separate sign-up step).
export async function createUserAccount(
  name: string,
  email: string,
  password: string,
  role: string,
  country: string
): Promise<{ user: SessionUser; token: string }> {
  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO users (name, email, password_hash, role, country) VALUES (?, ?, ?, ?, ?)",
    [name, email, passwordHash, role, country || ""]
  );
  const user: SessionUser = { id: result.insertId, name, email, role, country: country || "" };
  // Every buyer gets a registration number (TUE0001, ...) the moment the account exists.
  if (role === "buyer") await assignBuyerNumberQuietly(result.insertId);
  return { user, token: signSessionToken(user) };
}

// A bcrypt hash of an unguessable, never-issued password -- used only to
// give a "no such user" lookup the same bcrypt.compare cost as a real
// password check below, so response latency can't be used to tell "email
// doesn't exist" apart from "email exists, wrong password" (the error
// message is already identical either way; this closes the timing gap
// between the two, not just the message).
const DUMMY_HASH_FOR_TIMING = "$2a$12$C6UzMDM.H6dfI/f/IKcEeOa8jTiJfyGX0mF/HzL8XeDQmJgb0e7Uy";

// `identifier` is an email, or (for buyers) the phone number or passport number
// saved on their profile. Several accounts can share a phone number, so every
// match is tried and the one whose password fits signs in.
export async function verifyUserPassword(identifier: string, password: string): Promise<SessionUser | null> {
  const id = (identifier || "").trim();
  let candidates: RowDataPacket[] = [];

  if (id.includes("@")) {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, email, role, country, status, password_hash FROM users WHERE email = ?",
      [id]
    );
    candidates = rows;
  } else {
    const phone = /^[\d\s()+\-]+$/.test(id) ? normalizeLoginPhone(id) : "";
    const passport = normalizePassportNumber(id);
    if (phone || passport) {
      const cleanPhone = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(p.phone_number, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '')";
      const cleanPassport = "UPPER(REPLACE(REPLACE(REPLACE(p.passport_number, ' ', ''), '-', ''), '.', ''))";
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT u.id, u.name, u.email, u.role, u.country, u.status, u.password_hash
         FROM users u JOIN buyer_profiles p ON p.user_id = u.id
         WHERE (? <> '' AND ${cleanPhone} IN (?, ?)) OR (? <> '' AND ${cleanPassport} = ?)
         LIMIT 5`,
        [phone, phone, "86" + phone, passport, passport]
      );
      candidates = rows;
    }
  }

  if (candidates.length === 0) {
    await bcrypt.compare(password, DUMMY_HASH_FOR_TIMING);
    return null;
  }
  for (const row of candidates) {
    if (!(await bcrypt.compare(password, row.password_hash))) continue;
    // A suspended admin can't log back in through this path -- confirmed
    // password doesn't matter once an admin has suspended the account.
    if (row.status === "suspended") return null;
    return { id: row.id, name: row.name, email: row.email, role: row.role, country: row.country };
  }
  return null;
}

// The account row a session token points at, with the time its password last changed (unix seconds,
// null if never). Before migration 061 has run the column does not exist: the lookup then simply
// goes without it, so nobody is signed out in the gap between the new code and the migration.
export async function loadSessionRow(id: number): Promise<(RowDataPacket & { password_changed_at: number | null }) | null> {
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, email, role, country, status, password_changed_at FROM users WHERE id = ?",
      [id]
    );
  } catch (err) {
    if ((err as { code?: string }).code !== "ER_BAD_FIELD_ERROR") throw err;
    [rows] = await pool.query<RowDataPacket[]>("SELECT id, name, email, role, country, status FROM users WHERE id = ?", [id]);
  }
  const row = rows[0];
  if (!row) return null;
  return Object.assign(row, { password_changed_at: row.password_changed_at == null ? null : Number(row.password_changed_at) });
}

// A password change (by the person, by "Forgot password", or by an admin) ends every session that
// was signed before it; the device that made the change is given a fresh one.
export function signedBeforePasswordChange(iat: number | undefined, changedAt: number | null): boolean {
  if (changedAt === null) return false;
  return typeof iat !== "number" || iat < changedAt;
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (!tokenMatch) return null;

    const decoded = jwt.verify(tokenMatch[1], JWT_SECRET) as SessionTokenPayload;
    const row = await loadSessionRow(decoded.id);
    if (!row) return null;
    // Suspending a user invalidates their existing session immediately on
    // their next request, not just future login attempts.
    if (row.status === "suspended") return null;
    if (signedBeforePasswordChange(decoded.iat, row.password_changed_at)) return null;
    return { id: row.id, name: row.name, email: row.email, role: row.role, country: row.country };
  } catch {
    return null;
  }
}

export async function requireAdmin(request: Request): Promise<SessionUser | null> {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") return null;
  // A staff role limits an admin to part of the back office (no role set = full access, as it always was).
  const preset = await getStaffPreset(user.id);
  const pathname = new URL(request.url).pathname;
  if (preset !== "full" && !canCallAdminApi(preset, request.method, pathname)) return null;
  // When two-step sign-in is required for every admin, one without it can only reach the screen that sets it up.
  if (!isTwoStepSetupPath(pathname) && (await mustSetUpTwoStep(user.id))) return null;
  return user;
}

/** For the few places that must be full access only (managing staff, merging accounts): the signed-in admin, if they have it. */
export async function requireFullAdmin(request: Request): Promise<SessionUser | null> {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") return null;
  if ((await getStaffPreset(user.id)) !== "full") return null;
  if (await mustSetUpTwoStep(user.id)) return null;
  return user;
}
