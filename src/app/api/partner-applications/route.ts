import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createPartnerApplication } from "@/lib/server/partner-applications-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

const LEAD_FORM_LIMIT = 5;
const LEAD_FORM_WINDOW_MS = 60 * 60 * 1000;

// Public lead capture, same as subsidy-applications/consultation-bookings --
// no login required. Applying is a request for admin review, not an
// instant self-selected role (see schema-migrations/023-partner-program.sql).
export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "partner-applications", LEAD_FORM_LIMIT, LEAD_FORM_WINDOW_MS);
  if (limited) return limited;

  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { tierId, name, email, phone, company, message } = body;

    if (!tierId || !name || !email) {
      return NextResponse.json({ error: "Tier, name, and email are required" }, { status: 400 });
    }

    const id = await createPartnerApplication({
      tierId: Number(tierId),
      userId: user?.id,
      name,
      email,
      phone: phone || "",
      company: company || "",
      message: message || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Partner application error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
