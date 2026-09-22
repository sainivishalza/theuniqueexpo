import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createTourDestinationInterest } from "@/lib/server/service-apps-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

const LEAD_FORM_LIMIT = 5;
const LEAD_FORM_WINDOW_MS = 60 * 60 * 1000;

// Public lead capture, same as city-partnership-inquiries/consultation-bookings --
// no login required.
export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "tour-destination-interest", LEAD_FORM_LIMIT, LEAD_FORM_WINDOW_MS);
  if (limited) return limited;

  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { destination, name, email, phone, message } = body;

    if (!destination || !name || !email) {
      return NextResponse.json({ error: "Destination, name, and email are required" }, { status: 400 });
    }

    const id = await createTourDestinationInterest({
      userId: user?.id,
      destination,
      name,
      email,
      phone: phone || "",
      message: message || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Tour destination interest error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
