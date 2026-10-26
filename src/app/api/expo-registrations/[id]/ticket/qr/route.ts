import QRCode from "qrcode";
import { loadOwnedSubject } from "@/lib/server/registration-pdf-route";
import { ticketUrl } from "@/lib/server/registration-pdfs";

// The e-ticket's QR code as a picture, for showing on the phone screen at the entrance (the same code as in the PDF).
// Only the buyer it belongs to, once attendance is confirmed.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await loadOwnedSubject(request, (await params).id, ["confirmed", "attended"]);
  if ("error" in loaded) return loaded.error;
  // A wide quiet border and big modules: a screen at an angle, or a scanner far away, still reads it.
  const png = await QRCode.toBuffer(ticketUrl(loaded.subject.registrationId), { margin: 4, width: 720, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
