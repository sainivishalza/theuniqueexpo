import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { ALL_REGISTRATIONS_PAGE_SIZE, listAllRegistrations, readFilter } from "@/lib/server/all-registrations";

// One page of every registration of every buyer, with the filters applied on the server.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
  const result = await listAllRegistrations(readFilter(searchParams), page, ALL_REGISTRATIONS_PAGE_SIZE);
  return NextResponse.json({ ...result, page, pageSize: ALL_REGISTRATIONS_PAGE_SIZE });
}
