import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getBuyerProfilesForExport } from "@/lib/server/buyer-profile-repo";
import { buildBuyersExcel, EXPORTABLE_FIELD_KEYS } from "@/lib/server/buyer-profile-export";
import { DOCUMENT_FIELDS } from "@/lib/server/buyer-profile-repo";

const ALL_FIELD_KEYS = new Set([...EXPORTABLE_FIELD_KEYS, ...DOCUMENT_FIELDS]);
const MAX_USER_IDS = 500;

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const userIds = Array.isArray(body?.userIds) ? body.userIds.filter((v: unknown) => typeof v === "number") : [];
  const fields = Array.isArray(body?.fields) ? body.fields.filter((v: unknown) => typeof v === "string" && ALL_FIELD_KEYS.has(v)) : [];

  if (userIds.length === 0) return NextResponse.json({ error: "Select at least one buyer" }, { status: 400 });
  if (userIds.length > MAX_USER_IDS) return NextResponse.json({ error: `Select at most ${MAX_USER_IDS} buyers per export` }, { status: 400 });
  if (fields.length === 0) return NextResponse.json({ error: "Select at least one field to export" }, { status: 400 });

  const rows = await getBuyerProfilesForExport(userIds);
  const buffer = await buildBuyersExcel(rows, fields);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="buyer-profiles-${date}.xlsx"`,
      "Content-Length": String(buffer.length),
    },
  });
}
