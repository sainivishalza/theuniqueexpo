import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { NextResponse } from "next/server";
import pool from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "theuniqueexpo-secret-key-change-in-production";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
  country: string;
}

function signSessionToken(user: Pick<SessionUser, "id" | "email" | "role">): string {
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
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password_hash, role, country) VALUES (?, ?, ?, ?, ?)",
    [name, email, passwordHash, role, country || ""]
  );
  const id = (result as any).insertId;
  const user: SessionUser = { id, name, email, role, country: country || "" };
  return { user, token: signSessionToken(user) };
}

export async function verifyUserPassword(email: string, password: string): Promise<SessionUser | null> {
  const [rows] = await pool.query(
    "SELECT id, name, email, role, country, password_hash FROM users WHERE email = ?",
    [email]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role, country: row.country };
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (!tokenMatch) return null;

    const decoded = jwt.verify(tokenMatch[1], JWT_SECRET) as any;
    const [rows] = await pool.query("SELECT id, name, email, role, country FROM users WHERE id = ?", [decoded.id]);
    const users = rows as SessionUser[];
    return users[0] || null;
  } catch {
    return null;
  }
}

export async function requireAdmin(request: Request): Promise<SessionUser | null> {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") return null;
  return user;
}
