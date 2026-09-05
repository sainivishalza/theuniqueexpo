import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createConsultationBooking } from "@/lib/server/service-apps-repo";

// Doesn't require login -- the consultation/relocation request forms are
// public-facing lead capture, same as the RFQ marketplace's public forms.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    const body = await request.json();
    const { name, email, company, topic, preferredDate, questions } = body;

    if (!name || !email || !topic) {
      return NextResponse.json({ error: "Name, email, and topic are required" }, { status: 400 });
    }

    const id = await createConsultationBooking({
      userId: user?.id,
      name,
      email,
      company: company || "",
      topic,
      preferredDate: preferredDate || "",
      questions: questions || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Consultation booking error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
