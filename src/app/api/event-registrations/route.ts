import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { isDuplicateEntryError } from "@/lib/db";
import {
  getEventBySlugOrId,
  createEventRegistration,
  findExistingEventRegistration,
  countActiveRegistrations,
} from "@/lib/server/events-repo";

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

    // capacity of 0 means unlimited (matches the admin form's default).
    if (event.capacity > 0) {
      const activeCount = await countActiveRegistrations(Number(event.id));
      if (activeCount >= event.capacity) {
        return NextResponse.json({ error: "This event is full" }, { status: 409 });
      }
    }

    const id = await createEventRegistration(user.id, Number(event.id));
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    // Two concurrent submits from the same user can both pass the
    // findExistingEventRegistration check above before either insert
    // lands -- the table's uniq_event_user constraint is the real guard,
    // so surface that as the same 409 rather than a generic 500.
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: "You've already registered for this event" }, { status: 409 });
    }
    console.error("Event registration error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
