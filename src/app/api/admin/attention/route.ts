import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getAttentionCounts } from "@/lib/server/admin-attention";
import { runRemindersInBackground } from "@/lib/server/reminders";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  // Opening the admin home also starts the reminder job (at most every 6 hours; see reminders.ts).
  runRemindersInBackground();
  return NextResponse.json(await getAttentionCounts(), { headers: { "Cache-Control": "no-store" } });
}
