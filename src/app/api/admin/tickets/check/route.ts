import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { setRegistrationStatus } from "@/lib/server/expo-registrations-repo";
import { getBuyerNumber } from "@/lib/server/buyer-numbers";
import { registrationIdFromTicketCode } from "@/lib/server/ticket-code";

// Venue staff scan an e-ticket's QR code: who is it, may they come in (GET), and let them in (POST, marks them attended).
// Admin only. A made-up or edited code is simply "not found".

async function describe(registrationId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.user_id, r.status, r.checked_in_at, r.confirm_by, e.title, e.slug, e.start_date, e.end_date, u.name,
            p.passport_name, p.company_name, p.nationality,
            CASE WHEN r.status = 'approved' AND r.confirm_by IS NOT NULL AND r.confirm_by < UTC_DATE() THEN 'expired' ELSE r.status END AS effective_status
     FROM expo_registrations r
     JOIN users u ON u.id = r.user_id
     JOIN exhibitions e ON e.id = r.exhibition_id
     LEFT JOIN buyer_profiles p ON p.user_id = r.user_id
     WHERE r.id = ? LIMIT 1`,
    [registrationId]
  );
  const r = rows[0];
  if (!r) return null;
  const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10));
  return {
    id: Number(r.id),
    name: String(r.passport_name || r.name || ""),
    company: String(r.company_name ?? ""),
    nationality: String(r.nationality ?? ""),
    buyerNumber: await getBuyerNumber(Number(r.user_id)),
    exhibitionTitle: String(r.title),
    exhibitionSlug: String(r.slug),
    exhibitionStart: day(r.start_date),
    exhibitionEnd: day(r.end_date),
    status: String(r.effective_status),
    checkedInAt: r.checked_in_at ? new Date(r.checked_in_at).toISOString() : null,
    // Confirmed registrations are let in. Approved ones have not confirmed yet; staff decide.
    canCheckIn: r.effective_status === "confirmed",
  };
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const id = registrationIdFromTicketCode(new URL(request.url).searchParams.get("code"));
  const found = id ? await describe(id) : null;
  if (!found) return NextResponse.json({ error: "This code is not a valid ticket", code: "invalid_code" }, { status: 404 });
  return NextResponse.json({ ticket: found });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = registrationIdFromTicketCode((body as { code?: unknown }).code);
  const found = id ? await describe(id) : null;
  if (!id || !found) return NextResponse.json({ error: "This code is not a valid ticket", code: "invalid_code" }, { status: 404 });
  if (found.status === "attended") return NextResponse.json({ error: "Already checked in", code: "already_checked_in", ticket: found }, { status: 409 });
  if (!found.canCheckIn) return NextResponse.json({ error: "This registration has not confirmed attendance", code: "not_confirmed", ticket: found }, { status: 409 });
  await setRegistrationStatus(id, "attended");
  logAdminAction(request, admin, "expo_registration_status", { targetType: "expo_registration", targetId: String(id), details: "confirmed → attended (ticket scan)" });
  return NextResponse.json({ ok: true, ticket: await describe(id) });
}
