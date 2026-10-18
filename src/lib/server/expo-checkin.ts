import { createHmac, timingSafeEqual } from "crypto";
import { JWT_SECRET } from "@/lib/auth-server";

// Each exhibition has one check-in QR code, printed or shown on a screen at the
// venue. The code carries this key; it is derived from the exhibition id and the
// server secret, so nothing extra is stored and a key for one exhibition never
// works for another. Scanning only helps someone who is signed in AND has a
// confirmed registration for that exhibition.
export function checkInKey(exhibitionId: number): string {
  return createHmac("sha256", JWT_SECRET).update(`expo-checkin:${exhibitionId}`).digest("base64url").slice(0, 22);
}

export function isValidCheckInKey(exhibitionId: number, key: unknown): boolean {
  if (typeof key !== "string") return false;
  const expected = Buffer.from(checkInKey(exhibitionId));
  const given = Buffer.from(key);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Path (without language prefix) the QR code points at.
export function checkInPath(slug: string, exhibitionId: number): string {
  return `/exhibitions/${encodeURIComponent(slug)}/check-in?k=${checkInKey(exhibitionId)}`;
}
