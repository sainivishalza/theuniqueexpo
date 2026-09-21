import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createPartnerInquiry } from "@/lib/server/service-apps-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

const LEAD_FORM_LIMIT = 5;
const LEAD_FORM_WINDOW_MS = 60 * 60 * 1000;

const PARTNER_TYPES = ["organizer", "company", "other"];

// Public lead capture for the "Partner With Us" page -- exhibition
// organizers and companies enquiring about a partnership, not the
// individual-affiliate Partner Program. No login required.
export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "partner-inquiries", LEAD_FORM_LIMIT, LEAD_FORM_WINDOW_MS);
  if (limited) return limited;

  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { name, email, company, partnerType, message } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const id = await createPartnerInquiry({
      userId: user?.id,
      name,
      email,
      company: company || "",
      partnerType: PARTNER_TYPES.includes(partnerType) ? partnerType : "other",
      message: message || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Partner inquiry error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
