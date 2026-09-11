import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { NextResponse } from "next/server";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

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
  return { user, token: signSessionToken(user) };
}

// A bcrypt hash of an unguessable, never-issued password -- used only to
// give a "no such user" lookup the same bcrypt.compare cost as a real
// password check below, so response latency can't be used to tell "email
// doesn't exist" apart from "email exists, wrong password" (the error
// message is already identical either way; this closes the timing gap
// between the two, not just the message).
const DUMMY_HASH_FOR_TIMING = "$2a$12$C6UzMDM.H6dfI/f/IKcEeOa8jTiJfyGX0mF/HzL8XeDQmJgb0e7Uy";

export async function verifyUserPassword(email: string, password: string): Promise<SessionUser | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, role, country, status, password_hash FROM users WHERE email = ?",
    [email]
  );
  const row = rows[0];
  if (!row) {
    await bcrypt.compare(password, DUMMY_HASH_FOR_TIMING);
    return null;
  }
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;
  // A suspended admin can't log back in through this path -- confirmed
  // password doesn't matter once an admin has suspended the account.
  if (row.status === "suspended") return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role, country: row.country };
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (!tokenMatch) return null;

    const decoded = jwt.verify(tokenMatch[1], JWT_SECRET) as SessionTokenPayload;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, email, role, country, status FROM users WHERE id = ?",
      [decoded.id]
    );
    const row = rows[0];
    if (!row) return null;
    // Suspending a user invalidates their existing session immediately on
    // their next request, not just future login attempts.
    if (row.status === "suspended") return null;
    return { id: row.id, name: row.name, email: row.email, role: row.role, country: row.country };
  } catch {
    return null;
  }
}

export async function requireAdmin(request: Request): Promise<SessionUser | null> {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") return null;
  return user;
}
