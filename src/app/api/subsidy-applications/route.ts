import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createSubsidyApplication } from "@/lib/server/service-apps-repo";

// Public lead capture, same as consultation-bookings -- no login required.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { subsidyId, name, email, company, message } = body;

    if (!subsidyId || !name || !email) {
      return NextResponse.json({ error: "Subsidy, name, and email are required" }, { status: 400 });
    }

    const id = await createSubsidyApplication({
      userId: user?.id,
      subsidyId,
      name,
      email,
      company: company || "",
      message: message || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Subsidy application error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
