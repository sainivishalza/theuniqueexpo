import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { listThreadsForUser } from "@/lib/server/messages-repo";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const threads = await listThreadsForUser(user.id);
  return NextResponse.json({ threads, currentUserId: String(user.id) });
}
