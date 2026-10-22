import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { createFormItem, formItemInUse, formTablesReady, getFormItems } from "@/lib/server/buyer-form-repo";
import { formErrorResponse } from "@/lib/server/buyer-form-api";
import { limitOrNull } from "@/lib/server/wallet-api";

// Admin -> Buyer form settings: every document and extra field, shown or hidden, and whether an
// item can still be deleted (only an added item nobody has filled in).
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  try {
    const items = await getFormItems();
    const withUse = await Promise.all(items.map(async (i) => ({ ...i, inUse: await formItemInUse(i) })));
    return NextResponse.json(
      { ready: await formTablesReady(), documents: withUse.filter((i) => i.kind === "document"), fields: withUse.filter((i) => i.kind === "field") },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return formErrorResponse(err);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const limited = await limitOrNull(admin.id, "buyer-form", 60, 60_000);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid_input", code: "invalid_input" }, { status: 400 });
  if (body.kind !== "document" && body.kind !== "field") return NextResponse.json({ error: "invalid_input", code: "invalid_input" }, { status: 400 });
  try {
    const item = await createFormItem(body.kind, {
      labels: body.labels && typeof body.labels === "object" ? body.labels : {},
      required: typeof body.required === "boolean" ? body.required : undefined,
      fieldType: body.fieldType,
      options: body.options && typeof body.options === "object" ? body.options : undefined,
    });
    return NextResponse.json({ item });
  } catch (err) {
    return formErrorResponse(err);
  }
}
