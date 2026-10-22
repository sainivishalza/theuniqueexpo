import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getBuyerProfilesForExport } from "@/lib/server/buyer-profile-repo";
import { buildBuyersExcel, EXPORTABLE_FIELD_KEYS } from "@/lib/server/buyer-profile-export";
import { getActiveFormItems } from "@/lib/server/buyer-form-repo";

// Keys that are always exportable; the documents and extra fields currently asked for are added per request.
const BUILTIN_FIELD_KEYS = new Set(EXPORTABLE_FIELD_KEYS);
// A sheet with documents embeds every photo, which is heavy; a plain sheet of
// details can be much longer.
const MAX_USER_IDS_WITH_DOCUMENTS = 500;
const MAX_USER_IDS_TEXT_ONLY = 5000;

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const userIds = Array.isArray(body?.userIds) ? body.userIds.filter((v: unknown) => typeof v === "number") : [];
  const items = await getActiveFormItems();
  const allowed = new Set([...BUILTIN_FIELD_KEYS, ...items.map((i) => i.key)]);
  const fields = Array.isArray(body?.fields) ? body.fields.filter((v: unknown) => typeof v === "string" && allowed.has(v)) : [];

  if (userIds.length === 0) return NextResponse.json({ error: "Select at least one buyer" }, { status: 400 });
  if (fields.length === 0) return NextResponse.json({ error: "Select at least one field to export" }, { status: 400 });
  const documentKeys = new Set(items.filter((i) => i.kind === "document").map((i) => i.key));
  const withDocuments = fields.some((f: string) => documentKeys.has(f));
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
  const buffer = await buildBuyersExcel(rows, orderedFields, items);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="buyer-profiles-${date}.xlsx"`,
      "Content-Length": String(buffer.length),
    },
  });
}
