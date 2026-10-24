import { NextResponse } from "next/server";
import { requireFullAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { getProtectionStatus, protectNextBatch } from "@/lib/server/document-protection";
import { checkRateLimit } from "@/lib/server/rate-limit";

// Admin -> Document protection: how many documents are encrypted (never the documents themselves), and encrypting the older ones a few at a time.
export async function GET(request: Request) {
  const admin = await requireFullAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getProtectionStatus(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const admin = await requireFullAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const skip = body?.skip;
  if (skip !== undefined && (!Array.isArray(skip) || skip.length > 500 || skip.some((k: unknown) => typeof k !== "string" || !/^[a-z_.]{1,60}\|[\w:.-]{1,80}$/.test(k)))) {
    return NextResponse.json({ error: "Invalid request", code: "bad_request" }, { status: 400 });
  }
  const limited = await checkRateLimit(`document-protection:${admin.id}`, 3000, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many requests", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  try {
    const first = !Array.isArray(skip) || skip.length === 0;
    if (first && body?.start === true) logAdminAction(request, admin, "documents_protect_started", { targetType: "settings" });
    const outcome = await protectNextBatch(new Set<string>(skip ?? []));
    if (outcome.remaining === 0) logAdminAction(request, admin, "documents_protect_finished", { targetType: "settings" });
    return NextResponse.json(outcome, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof Error && err.message === "no_key") return NextResponse.json({ error: "No key is set", code: "no_key" }, { status: 409 });
    console.error("Protect documents error:", err);
    return NextResponse.json({ error: "Failed", code: "failed" }, { status: 500 });
  }
}
