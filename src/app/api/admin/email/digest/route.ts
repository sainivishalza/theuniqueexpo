import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { isMailEnabled } from "@/lib/server/mail";
import { asLocale } from "@/lib/server/notifications";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getDigestStatus, saveDigestEnabled, sendDigestPreview } from "@/lib/server/weekly-digest";

async function overview() {
  const status = await getDigestStatus();
  return { available: status !== null, enabled: status?.enabled ?? false, lastBatchAt: status?.lastBatchAt ?? null, lastCount: status?.lastCount ?? 0 };
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json(await overview(), { headers: { "Cache-Control": "no-store" } });
}

// Switch the weekly e-mail to buyers on or off.
export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") return NextResponse.json({ error: "Choose on or off", code: "bad_request" }, { status: 400 });
  if (!(await saveDigestEnabled(body.enabled, admin.id))) return NextResponse.json({ error: "Not available yet", code: "unavailable" }, { status: 503 });
  logAdminAction(request, admin, "weekly_digest_setting_changed", { targetType: "settings", details: body.enabled ? "on" : "off" });
  return NextResponse.json({ ok: true, ...(await overview()) });
}

// "Send me a preview": the e-mail as buyers would get it, only to the signed-in admin's own address.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.action !== "preview") return NextResponse.json({ error: "Unknown action", code: "bad_request" }, { status: 400 });
  if (!(await isMailEnabled())) return NextResponse.json({ error: "E-mail is switched off", code: "mail_off" }, { status: 409 });
  const limited = await checkRateLimit(`digest-preview:${admin.id}`, 10, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many previews in the last hour", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const result = await sendDigestPreview({ id: admin.id, name: admin.name, email: admin.email, locale: asLocale(body?.locale) });
  if (result === "nothing_new") return NextResponse.json({ error: "No exhibition was added in the last week", code: "nothing_new" }, { status: 409 });
  if (result === "failed") return NextResponse.json({ error: "The e-mail could not be sent", code: "send_failed" }, { status: 502 });
  logAdminAction(request, admin, "weekly_digest_preview_sent", { targetType: "settings" });
  return NextResponse.json({ ok: true, ...(await overview()) });
}
