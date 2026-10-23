import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { findDuplicateGroups } from "@/lib/server/buyer-duplicates";

// Buyers who signed up more than once: the same passport number or the same phone number.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json({ groups: await findDuplicateGroups() }, { headers: { "Cache-Control": "no-store" } });
}
