import { pdfResponse, loadOwnedSubject } from "@/lib/server/registration-pdf-route";
import { buildTicket } from "@/lib/server/registration-pdfs";

// The e-ticket / badge (PDF with a QR code) once the buyer has confirmed attendance.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await loadOwnedSubject(request, (await params).id, ["confirmed", "attended"]);
  if ("error" in loaded) return loaded.error;
  return pdfResponse(await buildTicket(loaded.subject), `ticket-${String(loaded.subject.registrationId).padStart(6, "0")}.pdf`);
}
