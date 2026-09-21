import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createBusinessTripInquiry } from "@/lib/server/service-apps-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

const LEAD_FORM_LIMIT = 5;
const LEAD_FORM_WINDOW_MS = 60 * 60 * 1000;

const ATTENDING_TYPES = ["in_china", "traveling", "unspecified"];

// Public lead capture, same as moving-quotes/city-partnership-inquiries --
// no login required. Powers every "Plan My Trip" / "Get Local Assistance" /
// "Request a Quote" button across the exhibitions and business-tours pages.
export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "business-trip-inquiries", LEAD_FORM_LIMIT, LEAD_FORM_WINDOW_MS);
  if (limited) return limited;

  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { name, email, phone, company, attendingType, tourType, exhibitionSlug, message } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const id = await createBusinessTripInquiry({
      userId: user?.id,
      name,
      email,
      phone: phone || "",
      company: company || "",
      attendingType: ATTENDING_TYPES.includes(attendingType) ? attendingType : "unspecified",
      tourType: typeof tourType === "string" ? tourType : "",
      exhibitionSlug: typeof exhibitionSlug === "string" ? exhibitionSlug : "",
      message: message || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Business trip inquiry error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
