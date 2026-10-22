import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listAuditLog } from "@/lib/server/audit-log";

// Who did what in the admin area, newest first: ?q= (search), ?action=, ?admin= (an admin's id), ?page=
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const adminId = Number(params.get("admin"));
  const result = await listAuditLog({
    q: (params.get("q") ?? "").trim().slice(0, 100),
    action: (params.get("action") ?? "").slice(0, 64),
    adminId: Number.isSafeInteger(adminId) && adminId > 0 ? adminId : undefined,
    page: Number(params.get("page")) || 1,
    pageSize: 50,
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
