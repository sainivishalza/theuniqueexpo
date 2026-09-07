import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createMovingQuote } from "@/lib/server/service-apps-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

const LEAD_FORM_LIMIT = 5;
const LEAD_FORM_WINDOW_MS = 60 * 60 * 1000;

// Public lead capture, same as consultation-bookings -- no login required.
export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "moving-quotes", LEAD_FORM_LIMIT, LEAD_FORM_WINDOW_MS);
  if (limited) return limited;

  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { name, email, phone, company, movingType, originCity, destinationCity, preferredDate, details } = body;

    if (!name || !email || !originCity || !destinationCity) {
      return NextResponse.json({ error: "Name, email, origin, and destination are required" }, { status: 400 });
    }

    const id = await createMovingQuote({
      userId: user?.id,
      name,
      email,
      phone: phone || "",
      company: company || "",
      movingType: movingType || "office",
      originCity,
      destinationCity,
      preferredDate: preferredDate || "",
      details: details || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Moving quote error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
