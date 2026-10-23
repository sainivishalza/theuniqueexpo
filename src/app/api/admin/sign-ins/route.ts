import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listDevices } from "@/lib/server/admin-security";

// The browsers and places the signed-in admin has signed in from (newest first).
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json({ devices: await listDevices(admin.id) }, { headers: { "Cache-Control": "no-store" } });
}
