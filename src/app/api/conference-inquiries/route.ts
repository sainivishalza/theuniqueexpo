import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createConferenceInquiry } from "@/lib/server/service-apps-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

const LEAD_FORM_LIMIT = 5;
const LEAD_FORM_WINDOW_MS = 60 * 60 * 1000;

// Public lead capture, same as subsidy-applications/consultation-bookings --
// no login required.
export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "conference-inquiries", LEAD_FORM_LIMIT, LEAD_FORM_WINDOW_MS);
  if (limited) return limited;

  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { name, email, company, eventType, expectedAttendees, preferredDate, details } = body;

    if (!name || !email || !eventType) {
      return NextResponse.json({ error: "Name, email, and event type are required" }, { status: 400 });
    }

    const id = await createConferenceInquiry({
      userId: user?.id,
      name,
      email,
      company: company || "",
      eventType,
      expectedAttendees: expectedAttendees || "",
      preferredDate: preferredDate || "",
      details: details || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Conference inquiry error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
