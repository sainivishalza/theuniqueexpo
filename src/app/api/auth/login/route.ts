import { NextResponse } from "next/server";
import { verifyUserPassword, signSessionToken, setSessionCookie } from "@/lib/auth-server";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const { allowed, retryAfterSeconds } = checkLoginRateLimit(request, email);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const user = await verifyUserPassword(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    resetLoginRateLimit(request, email);

    const token = signSessionToken(user);
    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
