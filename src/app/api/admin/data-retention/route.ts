import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { getRetentionSettings, isRetentionDays, listRetentionRuns, previewRetention, RETENTION_DAYS, runRetention, saveRetentionSettings } from "@/lib/server/data-retention";
import { checkRateLimit } from "@/lib/server/rate-limit";

async function overview(days?: number) {
  const settings = await getRetentionSettings();
  const chosen = days && isRetentionDays(days) ? days : settings?.days ?? 90;
  return { available: settings !== null, settings: settings ?? { enabled: false, days: 90 }, options: RETENTION_DAYS, preview: await previewRetention(chosen), previewDays: chosen, runs: await listRetentionRuns() };
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const days = Number(new URL(request.url).searchParams.get("days")) || undefined;
  return NextResponse.json(await overview(days), { headers: { "Cache-Control": "no-store" } });
}

// Switch the policy on or off and choose after how many days.
export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean" || !isRetentionDays(body?.days)) return NextResponse.json({ error: "Choose on or off and a number of days", code: "bad_request" }, { status: 400 });
  if (!(await saveRetentionSettings({ enabled: body.enabled, days: body.days }, admin.id))) return NextResponse.json({ error: "Not available yet", code: "unavailable" }, { status: 503 });
  logAdminAction(request, admin, "retention_settings_changed", { targetType: "settings", details: `${body.enabled ? "on" : "off"}, ${body.days} days` });
  return NextResponse.json({ ok: true, ...(await overview()) });
}

// "Delete now": runs the policy at once with the chosen number of days, even when it is switched off.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.action !== "run" || !isRetentionDays(body?.days)) return NextResponse.json({ error: "Choose a number of days", code: "bad_request" }, { status: 400 });
  const limited = await checkRateLimit(`retention-run:${admin.id}`, 10, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many runs in the last hour", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  if (!(await getRetentionSettings())) return NextResponse.json({ error: "Not available yet", code: "unavailable" }, { status: 503 });
  const result = await runRetention("manual", admin.id, body.days);
  logAdminAction(request, admin, "retention_run", { targetType: "settings", details: `${body.days} days: ${result.profiles} profiles, ${result.files} files, ${result.registrations} registrations` });
  return NextResponse.json({ ok: true, result, ...(await overview(body.days)) });
}
