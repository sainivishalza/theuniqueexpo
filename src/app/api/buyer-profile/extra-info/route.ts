import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { listExtraInfo } from "@/lib/server/buyer-extra-info";

// The answers this buyer gave to registration questions the profile has no field for (shown on the profile page).
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  return NextResponse.json({ items: await listExtraInfo(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
