import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getMailPreferences, isMailPreference, setMailPreferences, type MailPreferences } from "@/lib/server/mail-preferences";

// "What e-mails do I get?" for the signed-in person.
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in", code: "unauthorized" }, { status: 401 });
  const preferences = await getMailPreferences(user.id);
  if (!preferences) return NextResponse.json({ error: "Not available yet", code: "unavailable" }, { status: 503 });
  return NextResponse.json({ preferences }, { headers: { "Cache-Control": "no-store" } });
}

// Turns optional e-mails on or off: { digest?: boolean, savedAlerts?: boolean }.
export async function PUT(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request", code: "invalid_input" }, { status: 400 });
  const changes: Partial<MailPreferences> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!isMailPreference(key) || typeof value !== "boolean") return NextResponse.json({ error: "Invalid request", code: "invalid_input" }, { status: 400 });
    changes[key] = value;
  }
  if (Object.keys(changes).length === 0) return NextResponse.json({ error: "Nothing to change", code: "invalid_input" }, { status: 400 });
  if (!(await setMailPreferences(user.id, changes))) return NextResponse.json({ error: "Not available yet", code: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true, preferences: await getMailPreferences(user.id) });
}

