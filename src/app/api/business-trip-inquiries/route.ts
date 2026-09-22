import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createBusinessTripInquiry } from "@/lib/server/service-apps-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

const LEAD_FORM_LIMIT = 5;
const LEAD_FORM_WINDOW_MS = 60 * 60 * 1000;

const ATTENDING_TYPES = ["in_china", "traveling", "unspecified"];
const NEEDS_OPTIONS = [
  "hotel", "airportTransfer", "exhibitionTransfer", "exhibitionAccompaniment", "interpreter",
  "supplierMeetings", "factoryVisits", "supplierSearch", "samples", "additionalChinaTrip",
];

// Public lead capture, same as moving-quotes/city-partnership-inquiries --
// no login required. Powers the full /plan-business-trip form as well as
// the lighter "Get Local Assistance" modal.
export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "business-trip-inquiries", LEAD_FORM_LIMIT, LEAD_FORM_WINDOW_MS);
  if (limited) return limited;

  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const {
      name, email, whatsapp, company, country, departureCity, attendingType, tourType,
      exhibitionSlug, arrivalDate, departureDate, travelers, needs, industry, route, destinations, message,
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const travelersNum = Number(travelers);

    const id = await createBusinessTripInquiry({
      userId: user?.id,
      name,
      email,
      whatsapp: whatsapp || "",
      company: company || "",
      country: country || "",
      departureCity: departureCity || "",
      attendingType: ATTENDING_TYPES.includes(attendingType) ? attendingType : "unspecified",
      tourType: typeof tourType === "string" ? tourType : "",
      exhibitionSlug: typeof exhibitionSlug === "string" ? exhibitionSlug : "",
      arrivalDate: typeof arrivalDate === "string" ? arrivalDate : "",
      departureDate: typeof departureDate === "string" ? departureDate : "",
      travelers: Number.isInteger(travelersNum) && travelersNum > 0 ? travelersNum : undefined,
      needs: Array.isArray(needs) ? needs.filter((n: unknown) => typeof n === "string" && NEEDS_OPTIONS.includes(n)) : [],
      industry: industry || "",
      route: typeof route === "string" ? route.slice(0, 255) : "",
      destinations: Array.isArray(destinations)
        ? destinations.filter((d: unknown): d is string => typeof d === "string").slice(0, 20).map((d) => d.slice(0, 100))
        : [],
      message: message || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Business trip inquiry error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
