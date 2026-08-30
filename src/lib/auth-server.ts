import jwt from "jsonwebtoken";
import pool from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "theuniqueexpo-secret-key-change-in-production";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
  country: string;
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
