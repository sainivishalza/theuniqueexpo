import { createHmac, timingSafeEqual } from "crypto";
import { JWT_SECRET } from "@/lib/auth-server";

// The code in an e-ticket's QR: the registration number and a short signature made with the server secret, so it
// cannot be guessed or made up for another registration, and nothing extra is stored. Scanning it only helps a
// signed-in admin (the ticket check page); to anyone else it is just a login page.
function sign(registrationId: number): string {
  return createHmac("sha256", JWT_SECRET).update(`e-ticket:${registrationId}`).digest("base64url").slice(0, 16);
}

export function ticketCode(registrationId: number): string {
  return `${registrationId}.${sign(registrationId)}`;
}

/** The registration number a genuine code belongs to, or null. */
export function registrationIdFromTicketCode(code: unknown): number | null {
  if (typeof code !== "string") return null;
  const m = /^(\d{1,10})\.([A-Za-z0-9_-]{16})$/.exec(code.trim());
  if (!m) return null;
  const id = Number(m[1]);
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(m[2]);
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}
