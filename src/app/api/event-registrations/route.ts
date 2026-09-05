import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getEventBySlugOrId, createEventRegistration, findExistingEventRegistration } from "@/lib/server/events-repo";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const { eventSlug } = await request.json();
    if (!eventSlug) return NextResponse.json({ error: "Missing event" }, { status: 400 });

    const event = await getEventBySlugOrId(eventSlug);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (!event.registrationEnabled) {
      return NextResponse.json({ error: "Registration is closed for this event" }, { status: 403 });
    }

    const existing = await findExistingEventRegistration(Number(event.id), user.id);
    if (existing) {
      return NextResponse.json({ error: "You've already registered for this event" }, { status: 409 });
    }

    const id = await createEventRegistration(user.id, Number(event.id));
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Event registration error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
