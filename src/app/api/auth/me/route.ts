import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { JWT_SECRET } from "@/lib/auth-server";

interface DecodedToken {
  id: number;
}

// "Not signed in" is a normal answer for anonymous visitors, so it is a 200
// with user: null -- a 401 here showed up as a red console error on every page.
export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (!tokenMatch) {
      return NextResponse.json({ user: null });
    }

    const decoded = jwt.verify(tokenMatch[1], JWT_SECRET) as DecodedToken;
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, email, role, country FROM users WHERE id = ?",
      [decoded.id]
    );

    if (users.length === 0) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: users[0] });
  } catch {
    return NextResponse.json({ user: null });
  }
}
