import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listUsers } from "@/lib/server/users-repo";
import { twoStepUserIds } from "@/lib/server/totp";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const [users, twoStep] = await Promise.all([listUsers(), twoStepUserIds()]);
  return NextResponse.json({ users: users.map((u) => ({ ...u, twoStep: twoStep.has(u.id) })) });
}
