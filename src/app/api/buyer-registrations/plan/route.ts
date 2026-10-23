import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { asLocale } from "@/lib/server/notifications";
import { planRegistrations } from "@/lib/server/bulk-registration";
import { MAX_EXHIBITIONS_AT_ONCE } from "@/lib/bulk-registration";

// What registering for these exhibitions needs: which of them can be registered for and the questions
// the buyer's profile cannot answer, each with the answer on file.  { slugs: [...] }
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });
  if (user.role !== "buyer") return NextResponse.json({ error: "buyers_only", code: "buyers_only" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const raw = body?.slugs;
  const slugs = Array.isArray(raw) ? Array.from(new Set(raw.filter((s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= 200))) : [];
  if (slugs.length === 0 || slugs.length > MAX_EXHIBITIONS_AT_ONCE) return NextResponse.json({ error: "invalid_input", code: "invalid_input" }, { status: 400 });
  const plan = await planRegistrations({ id: user.id, name: user.name, email: user.email }, slugs, asLocale(body?.locale));
  return NextResponse.json(plan, { headers: { "Cache-Control": "no-store" } });
}
