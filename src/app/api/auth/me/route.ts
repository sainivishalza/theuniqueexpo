import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { JWT_SECRET, loadSessionRow, signedBeforePasswordChange } from "@/lib/auth-server";

interface DecodedToken {
  id: number;
  iat?: number;
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
    const row = await loadSessionRow(decoded.id);
    // A suspended (or deleted) account is signed out at once, as it is for every other request.
    if (!row || row.status === "suspended" || signedBeforePasswordChange(decoded.iat, row.password_changed_at)) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: { id: row.id, name: row.name, email: row.email, role: row.role, country: row.country } });
  } catch {
    return NextResponse.json({ user: null });
  }
}
