import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { createUserAccount, setSessionCookie } from "@/lib/auth-server";

// "admin" is deliberately excluded -- it's a UserRole (for session/UI typing)
// but not something the public sign-up endpoint may hand out.
const REGISTERABLE_ROLES = ["buyer", "exhibitor", "visitor", "partner"];

export async function POST(request: Request) {
  try {
    const { name, email, password, role, country } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (role !== undefined && !REGISTERABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if user already exists
    const [existing] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const { user, token } = await createUserAccount(name, email, password, role || "buyer", country || "");

    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
