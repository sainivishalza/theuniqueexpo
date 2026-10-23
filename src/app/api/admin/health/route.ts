import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { buildHealthReport, getHealthEnabled, lastHealthEmailDay, saveHealthEnabled, sendHealthEmail } from "@/lib/server/health-report";
import { isMailEnabled } from "@/lib/server/mail";
import { checkRateLimit } from "@/lib/server/rate-limit";

async function overview() {
  const enabled = await getHealthEnabled();
  return { available: enabled !== null, enabled: enabled ?? true, lastSentOn: await lastHealthEmailDay(), report: await buildHealthReport() };
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json(await overview(), { headers: { "Cache-Control": "no-store" } });
}

// Switch the daily e-mail on or off.
export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") return NextResponse.json({ error: "Choose on or off", code: "bad_request" }, { status: 400 });
  if (!(await saveHealthEnabled(body.enabled, admin.id))) return NextResponse.json({ error: "Not available yet", code: "unavailable" }, { status: 503 });
  logAdminAction(request, admin, "health_email_setting_changed", { targetType: "settings", details: body.enabled ? "on" : "off" });
  return NextResponse.json({ ok: true, ...(await overview()) });
}

// "Send me the report now": only to the signed-in admin's own address.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.action !== "send") return NextResponse.json({ error: "Unknown action", code: "bad_request" }, { status: 400 });
  if (!(await isMailEnabled())) return NextResponse.json({ error: "E-mail is switched off", code: "mail_off" }, { status: 409 });
  const limited = await checkRateLimit(`health-send:${admin.id}`, 10, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many sends in the last hour", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const sent = await sendHealthEmail([{ id: admin.id, email: admin.email }]);
  if (sent !== 1) return NextResponse.json({ error: "The e-mail could not be sent", code: "send_failed" }, { status: 502 });
  logAdminAction(request, admin, "health_email_sent_now", { targetType: "settings" });
  return NextResponse.json({ ok: true, ...(await overview()) });
}
