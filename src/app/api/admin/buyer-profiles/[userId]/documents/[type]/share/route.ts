import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { documentAccess } from "@/lib/server/buyer-profile-repo";
import { createShareLink, listShareLinks, revokeShareLink, SHARE_HOURS } from "@/lib/server/document-share";
import { checkRateLimit } from "@/lib/server/rate-limit";

type Params = { params: Promise<{ userId: string; type: string }> };

async function target(params: Params["params"]): Promise<{ userId: number; type: string } | null> {
  const { userId, type } = await params;
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0 || !(await documentAccess(type)).exists) return null;
  return { userId: id, type };
}

// The active share links of one document.
export async function GET(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const t = await target(params);
  if (!t) return NextResponse.json({ error: "Unknown document", code: "not_found" }, { status: 404 });
  return NextResponse.json({ links: await listShareLinks(t.userId, t.type), hours: SHARE_HOURS }, { headers: { "Cache-Control": "no-store" } });
}

// Makes a link that shows this document without signing in, for 1 hour, 1, 3 or 7 days.
export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const t = await target(params);
  if (!t) return NextResponse.json({ error: "Unknown document", code: "not_found" }, { status: 404 });
  const body = await request.json().catch(() => null);
  const hours = Number(body?.hours);
  if (!(SHARE_HOURS as readonly number[]).includes(hours)) return NextResponse.json({ error: "Choose how long the link works", code: "bad_hours" }, { status: 400 });
  const limited = await checkRateLimit(`doc-share:${admin.id}`, 30, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many links in the last hour", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const made = await createShareLink({ id: admin.id, name: admin.name }, t.userId, t.type, hours);
  if (made === "no_document") return NextResponse.json({ error: "No document uploaded", code: "no_document" }, { status: 404 });
  if (made === "limit") return NextResponse.json({ error: "Too many active links for this document", code: "limit" }, { status: 409 });
  if (made === "unavailable") return NextResponse.json({ error: "Not available yet", code: "unavailable" }, { status: 503 });
  logAdminAction(request, admin, "document_link_created", { targetType: "user", targetId: t.userId, details: `${t.type}, ${hours} h` });
  return NextResponse.json({ ok: true, path: `/api/shared-document/${made.token}`, expiresAt: made.expiresAt, links: await listShareLinks(t.userId, t.type) });
}

// ?id= stops one link at once.
export async function DELETE(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const t = await target(params);
  if (!t) return NextResponse.json({ error: "Unknown document", code: "not_found" }, { status: 404 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0 || !(await revokeShareLink(t.userId, t.type, id))) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  logAdminAction(request, admin, "document_link_revoked", { targetType: "user", targetId: t.userId, details: t.type });
  return NextResponse.json({ ok: true, links: await listShareLinks(t.userId, t.type) });
}
