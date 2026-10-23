import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { checkRateLimit, peekRateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { logAdminAction } from "@/lib/server/audit-log";
import { forgetSecurityCaches } from "@/lib/server/admin-security";
import {
  beginSetup, confirmSetup, disableTwoStep, isTwoStepOn, recoveryCodesLeft, regenerateRecoveryCodes, verifySecondStep,
} from "@/lib/server/totp";

const ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;

function fail(code: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: code, code }, { status, headers });
}

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return fail("unauthorized", 401);
  const enabled = await isTwoStepOn(admin.id);
  return NextResponse.json({ enabled, recoveryCodesLeft: enabled ? await recoveryCodesLeft(admin.id) : 0 }, { headers: noStore });
}

async function passwordIsRight(userId: number, password: unknown): Promise<boolean> {
  if (typeof password !== "string" || password === "" || password.length > 200) return false;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT password_hash FROM users WHERE id = ?", [userId]);
  const hash = rows[0]?.password_hash as string | undefined;
  return !!hash && (await bcrypt.compare(password, hash));
}

// Set up (asks for the password again, so a session left open cannot be used to take over the codes), confirm, turn off, or get new recovery codes for the signed-in admin's own two-step sign-in.
// Turning it off or getting new recovery codes asks for the password again, and (for turning off) a current code.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return fail("unauthorized", 401);
  const body = await request.json().catch(() => null);
  const action = body?.action;

  const key = `two-step-manage:${admin.id}`;
  const blocked = await peekRateLimit(key, ATTEMPTS);
  if (!blocked.allowed) return fail("rate_limited", 429, { "Retry-After": String(blocked.retryAfterSeconds) });

  if (action === "start") {
    if (!(await passwordIsRight(admin.id, body?.password))) {
      await checkRateLimit(key, ATTEMPTS, WINDOW_MS);
      return fail("wrong_password", 403);
    }
    await resetRateLimit(key);
    const started = await beginSetup(admin.id, admin.email);
    if (!started) return fail("already_on", 409);
    const qr = await QRCode.toDataURL(started.uri, { width: 480, margin: 2, errorCorrectionLevel: "M" });
    return NextResponse.json({ secret: started.secret, uri: started.uri, qr }, { headers: noStore });
  }

  if (action === "confirm") {
    const codes = typeof body?.code === "string" ? await confirmSetup(admin.id, body.code.trim()) : null;
    if (!codes) {
      await checkRateLimit(key, ATTEMPTS, WINDOW_MS);
      return fail("wrong_code", 400);
    }
    await resetRateLimit(key);
    forgetSecurityCaches();
    logAdminAction(request, admin, "two_step_on", { targetType: "user", targetId: admin.id });
    return NextResponse.json({ enabled: true, recoveryCodes: codes }, { headers: noStore });
  }

  if (action === "disable" || action === "recoveryCodes") {
    if (!(await isTwoStepOn(admin.id))) return fail("not_on", 409);
    // The password first: a recovery code is used up when it is checked, so it must not be spent on a request that is refused anyway.
    const codeOk = (await passwordIsRight(admin.id, body?.password)) && (action === "recoveryCodes" || (typeof body?.code === "string" && (await verifySecondStep(admin.id, body.code)) !== "wrong"));
    if (!codeOk) {
      await checkRateLimit(key, ATTEMPTS, WINDOW_MS);
      return fail("wrong_password_or_code", 403);
    }
    await resetRateLimit(key);
    if (action === "disable") {
      await disableTwoStep(admin.id);
      forgetSecurityCaches();
      logAdminAction(request, admin, "two_step_off", { targetType: "user", targetId: admin.id });
      return NextResponse.json({ enabled: false }, { headers: noStore });
    }
    const codes = await regenerateRecoveryCodes(admin.id);
    logAdminAction(request, admin, "two_step_new_recovery_codes", { targetType: "user", targetId: admin.id });
    return NextResponse.json({ enabled: true, recoveryCodes: codes }, { headers: noStore });
  }

  return fail("invalid_input", 400);
}
