import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createPartnerInquiry } from "@/lib/server/service-apps-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

const LEAD_FORM_LIMIT = 5;
const LEAD_FORM_WINDOW_MS = 60 * 60 * 1000;

const PARTNER_TYPES = [
  "organizer", "company_brand", "service_provider", "hotel_transportation",
  "factory_supplier", "business_association", "tourism_partner", "other",
];
const TOPICS_OPTIONS = [
  "exhibitionPromotion", "buyerRecruitment", "businessDelegation", "b2bMatchmaking",
  "businessTours", "supplierNetwork", "localServices", "other",
];

// Public lead capture for the "Partner With Us" page -- exhibition
// organizers, companies, and service providers enquiring about a
// partnership, not the individual-affiliate Partner Program. No login
// required.
export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "partner-inquiries", LEAD_FORM_LIMIT, LEAD_FORM_WINDOW_MS);
  if (limited) return limited;

  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { name, email, whatsapp, company, website, country, partnerType, topics, message } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const id = await createPartnerInquiry({
      userId: user?.id,
      name,
      email,
      whatsapp: whatsapp || "",
      company: company || "",
      website: website || "",
      country: country || "",
      partnerType: PARTNER_TYPES.includes(partnerType) ? partnerType : "other",
      topics: Array.isArray(topics) ? topics.filter((t: unknown) => typeof t === "string" && TOPICS_OPTIONS.includes(t)) : [],
      message: message || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Partner inquiry error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
