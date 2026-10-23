import { NextResponse } from "next/server";
import { verifyUserPassword, signSessionToken, setSessionCookie } from "@/lib/auth-server";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/server/rate-limit";
import { detectLocale, rememberLocale } from "@/lib/server/notifications";
import { isTwoStepOn, signChallenge } from "@/lib/server/totp";
import { logAdminAction } from "@/lib/server/audit-log";
import { noteAdminSignIn } from "@/lib/server/admin-security";

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
    // An admin with two-step sign-in on is not signed in yet: the browser gets a short-lived pass and
    // must come back with the code from the authenticator app (/api/auth/login/totp).
    if (user.role === "admin" && (await isTwoStepOn(user.id))) {
      return NextResponse.json({ needsSecondStep: true, challenge: signChallenge(user.id) });
    }
    await resetLoginRateLimit(request, email);

    if (user.role === "admin") {
      logAdminAction(request, user, "sign_in", { targetType: "user", targetId: user.id });
      noteAdminSignIn(request, user);
    }
    rememberLocale(user.id, detectLocale(request));
    const token = signSessionToken(user);
    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
