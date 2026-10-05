import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listNewsletterSubscribers } from "@/lib/server/newsletter-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const subscribers = await listNewsletterSubscribers();
  return NextResponse.json({ subscribers });
}
