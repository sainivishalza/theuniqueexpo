import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { createUserAccount, setSessionCookie } from "@/lib/auth-server";
import { rateLimitOrNull } from "@/lib/server/rate-limit";
import { isValidPartnerId, createReferral } from "@/lib/server/partner-referrals-repo";

// "admin" is deliberately excluded -- it's a UserRole (for session/UI typing)
// but not something the public sign-up endpoint may hand out.
const REGISTERABLE_ROLES = ["buyer", "exhibitor", "partner"];

const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "register", REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (limited) return limited;

  try {
    const { name, email, password, role, country, ref } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
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

    // Referral tracking is a side effect of registration, never a
    // condition for it -- a stale/invalid/self-referral link should never
    // fail the actual signup.
    const partnerId = Number(ref);
    if (ref && Number.isInteger(partnerId) && partnerId !== user.id) {
      try {
        if (await isValidPartnerId(partnerId)) {
          await createReferral(partnerId, user.id);
        }
      } catch (err) {
        console.error("Referral tracking error (registration still succeeded):", err);
      }
    }

    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
