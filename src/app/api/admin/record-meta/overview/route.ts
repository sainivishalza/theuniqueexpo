import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getOverview, parseType } from "@/lib/server/record-meta";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

// Every tag and assignee of one kind of record (?type=buyer), to filter a list by them.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const type = parseType(new URL(request.url).searchParams.get("type"));
  if (!type) return NextResponse.json({ error: "Unknown type", code: "bad_type" }, { status: 400 });
  const [admins] = await pool.query<RowDataPacket[]>("SELECT id, name FROM users WHERE role = 'admin' AND status <> 'suspended' ORDER BY name, id");
  return NextResponse.json({ ...(await getOverview(type)), admins: admins.map((a) => ({ id: Number(a.id), name: String(a.name) })), me: admin.id }, { headers: { "Cache-Control": "no-store" } });
}
