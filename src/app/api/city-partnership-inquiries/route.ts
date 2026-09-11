import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createCityPartnershipInquiry } from "@/lib/server/service-apps-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

const LEAD_FORM_LIMIT = 5;
const LEAD_FORM_WINDOW_MS = 60 * 60 * 1000;

// Public lead capture, same as subsidy-applications/consultation-bookings --
// no login required.
export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "city-partnership-inquiries", LEAD_FORM_LIMIT, LEAD_FORM_WINDOW_MS);
  if (limited) return limited;

  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { name, email, organization, city, country, message } = body;

    if (!name || !email || !organization) {
      return NextResponse.json({ error: "Name, email, and organization are required" }, { status: 400 });
    }

    const id = await createCityPartnershipInquiry({
      userId: user?.id,
      name,
      email,
      organization,
      city: city || "",
      country: country || "",
      message: message || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("City partnership inquiry error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
