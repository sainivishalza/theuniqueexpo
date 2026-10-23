import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { clearBounce, forgetSuppressed, hardBouncedAddresses, listBounces } from "@/lib/server/email-bounces";

// The addresses that bounced. ?summary=1 is just the hard-bounced addresses (the admin lists mark those buyers).
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const summary = new URL(request.url).searchParams.get("summary") === "1";
  if (summary) return NextResponse.json({ hard: await hardBouncedAddresses() }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ bounces: await listBounces() }, { headers: { "Cache-Control": "no-store" } });
}

// ?id= takes the flag off, so the address is e-mailed again.
export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0 || !(await clearBounce(id))) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  forgetSuppressed();
  logAdminAction(request, admin, "email_bounce_cleared", { targetType: "email_bounce", targetId: id });
  return NextResponse.json({ ok: true, bounces: await listBounces() });
}
