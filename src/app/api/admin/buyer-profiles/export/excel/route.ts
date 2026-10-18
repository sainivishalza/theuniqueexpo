import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getBuyerProfilesForExport } from "@/lib/server/buyer-profile-repo";
import { buildBuyersExcel, EXPORTABLE_FIELD_KEYS } from "@/lib/server/buyer-profile-export";
import { DOCUMENT_FIELDS } from "@/lib/server/buyer-profile-repo";

const ALL_FIELD_KEYS = new Set([...EXPORTABLE_FIELD_KEYS, ...DOCUMENT_FIELDS]);
// A sheet with documents embeds every photo, which is heavy; a plain sheet of
// details can be much longer.
const MAX_USER_IDS_WITH_DOCUMENTS = 500;
const MAX_USER_IDS_TEXT_ONLY = 5000;

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const userIds = Array.isArray(body?.userIds) ? body.userIds.filter((v: unknown) => typeof v === "number") : [];
  const fields = Array.isArray(body?.fields) ? body.fields.filter((v: unknown) => typeof v === "string" && ALL_FIELD_KEYS.has(v)) : [];

  if (userIds.length === 0) return NextResponse.json({ error: "Select at least one buyer" }, { status: 400 });
  if (fields.length === 0) return NextResponse.json({ error: "Select at least one field to export" }, { status: 400 });
  const withDocuments = fields.some((f: string) => (DOCUMENT_FIELDS as readonly string[]).includes(f));
  const maxIds = withDocuments ? MAX_USER_IDS_WITH_DOCUMENTS : MAX_USER_IDS_TEXT_ONLY;
  if (userIds.length > maxIds) {
    return NextResponse.json(
      { error: withDocuments ? `Select at most ${maxIds} buyers when documents are included (or untick the documents to export up to ${MAX_USER_IDS_TEXT_ONLY})` : `Select at most ${maxIds} buyers per export` },
      { status: 400 }
    );
  }

  // The registration number always comes first, so every row says which buyer it is.
  const orderedFields = ["buyerNumber", ...fields.filter((f: string) => f !== "buyerNumber")];
  const rows = await getBuyerProfilesForExport(userIds);
  const buffer = await buildBuyersExcel(rows, orderedFields);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="buyer-profiles-${date}.xlsx"`,
      "Content-Length": String(buffer.length),
    },
  });
}
