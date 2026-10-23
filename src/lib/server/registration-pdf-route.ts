import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { getMyRegistration } from "@/lib/server/expo-registrations-repo";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { loadDocumentSubject, type DocumentSubject } from "@/lib/server/registration-pdfs";
import type { EffectiveStatus } from "@/lib/registration-lifecycle";

// Shared by the two PDF routes: the signed-in owner of the registration, in a status that allows the document.
export async function loadOwnedSubject(
  request: Request,
  idParam: string,
  allowed: EffectiveStatus[]
): Promise<{ subject: DocumentSubject } | { error: NextResponse }> {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: "Please sign in", code: "unauthorized" }, { status: 401 }) };
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { error: NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 }) };
  const [rows] = await pool.query<RowDataPacket[]>("SELECT exhibition_id FROM expo_registrations WHERE id = ? AND user_id = ? LIMIT 1", [id, user.id]);
  // Someone else's registration looks exactly like one that does not exist.
  if (!rows[0]) return { error: NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 }) };
  const limited = await checkRateLimit(`reg-pdf:${user.id}`, 60, 60 * 60_000);
  if (!limited.allowed) return { error: NextResponse.json({ error: "Too many downloads, try again later", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }) };
  const mine = await getMyRegistration(Number(rows[0].exhibition_id), user.id);
  if (!mine || !allowed.includes(mine.status)) return { error: NextResponse.json({ error: "This document is not available for this registration yet", code: "not_available" }, { status: 409 }) };
  const subject = await loadDocumentSubject(id);
  if (!subject) return { error: NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 }) };
  return { subject };
}

export function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
