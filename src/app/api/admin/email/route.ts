import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getMailSettings, listMailLog, saveMailSettings, validateMailSettings, type MailSettingsInput } from "@/lib/server/mail";
import { asLocale, sendTestEmail } from "@/lib/server/notifications";

// Admin -> Email: what the sending settings are (never the saved password), and the recent sends.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  return NextResponse.json({ settings: await getMailSettings(), log: await listMailLog(50) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request", code: "invalid_input" }, { status: 400 });

  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const input: MailSettingsInput = {
    enabled: body.enabled === true,
    host: str(body.host, 200),
    port: Number(body.port),
    secure: body.secure === true,
    username: str(body.username, 200),
    // Left out: keep the saved password. Sent as text: replace it ("" removes it).
    password: typeof body.password === "string" ? body.password : undefined,
    fromName: str(body.fromName, 120),
    fromEmail: str(body.fromEmail, 200),
  };
  const problem = validateMailSettings(input);
  if (problem) return NextResponse.json({ error: problem, code: problem }, { status: 400 });
  await saveMailSettings(input);
  return NextResponse.json({ settings: await getMailSettings() });
}

// Sends a test message to the admin's own address, so they see at once whether the settings work.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const limited = await checkRateLimit(`mail-test:${admin.id}`, 10, 10 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many tests. Please wait a few minutes.", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const body = await request.json().catch(() => ({}));
  const result = await sendTestEmail(admin.email, asLocale(body?.locale), admin.name);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
