import { NextResponse } from "next/server";
import { pdfResponse, loadOwnedSubject } from "@/lib/server/registration-pdf-route";
import { buildInvitationLetter, invitationMissing, invitationReference } from "@/lib/server/registration-pdfs";

// The visa invitation letter (PDF) for an approved registration. It needs the passport name and number from the profile.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await loadOwnedSubject(request, (await params).id, ["approved", "confirmed", "attended"]);
  if ("error" in loaded) return loaded.error;
  const missing = invitationMissing(loaded.subject);
  if (missing.length > 0) {
    return NextResponse.json({ error: "Add your passport name and number to your profile first", code: "profile_incomplete", missing }, { status: 409 });
  }
  return pdfResponse(await buildInvitationLetter(loaded.subject), `${invitationReference(loaded.subject.registrationId)}.pdf`);
}
