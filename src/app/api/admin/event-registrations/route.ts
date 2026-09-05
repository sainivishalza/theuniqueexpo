import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getEventBySlugOrId, listRegistrationsForEvent } from "@/lib/server/events-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventSlug = searchParams.get("event");
  if (!eventSlug) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  const event = await getEventBySlugOrId(eventSlug);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const registrations = await listRegistrationsForEvent(Number(event.id));
  return NextResponse.json({ event, registrations });
}
