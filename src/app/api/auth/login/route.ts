import { NextResponse } from "next/server";
import { verifyUserPassword, signSessionToken, setSessionCookie } from "@/lib/auth-server";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // `email` still works; the field also takes a phone or passport number.
    const email = String(body.identifier ?? body.email ?? "").trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Login and password are required" }, { status: 400 });
    }

    const { allowed, retryAfterSeconds } = await checkLoginRateLimit(request, email);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const user = await verifyUserPassword(email, password);
    if (!user) {
      return NextResponse.json({ error: "Incorrect login details or password" }, { status: 401 });
    }
    await resetLoginRateLimit(request, email);

    const token = signSessionToken(user);
    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
