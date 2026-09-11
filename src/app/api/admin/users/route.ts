import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listUsers } from "@/lib/server/users-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const users = await listUsers();
  return NextResponse.json({ users });
}
