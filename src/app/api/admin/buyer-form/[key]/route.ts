import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { requireAdmin } from "@/lib/auth-server";
import { deleteFormItem, moveFormItem, updateFormItem } from "@/lib/server/buyer-form-repo";
import { formErrorResponse } from "@/lib/server/buyer-form-api";
import { limitOrNull } from "@/lib/server/wallet-api";

const KEY = /^[A-Za-z0-9_]{1,40}$/;

// Change an item: its names, shown/hidden, required, its choices, or move it up or down.
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const limited = await limitOrNull(admin.id, "buyer-form", 60, 60_000);
  if (limited) return limited;
  const { key } = await params;
  if (!KEY.test(key)) return NextResponse.json({ error: "not_found", code: "not_found" }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid_input", code: "invalid_input" }, { status: 400 });
  try {
    if (body.move === "up" || body.move === "down") {
      await moveFormItem(key, body.move);
      logAdminAction(request, admin, "buyer_form_item_moved", { targetType: "buyer_form", targetId: key, details: body.move });
      return NextResponse.json({ success: true });
    }
    const item = await updateFormItem(key, {
      labels: body.labels && typeof body.labels === "object" ? body.labels : undefined,
      required: typeof body.required === "boolean" ? body.required : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
      options: body.options && typeof body.options === "object" ? body.options : undefined,
    });
    logAdminAction(request, admin, "buyer_form_item_changed", { targetType: "buyer_form", targetId: key });
    return NextResponse.json({ item });
  } catch (err) {
    return formErrorResponse(err);
  }
}

// Only an item an admin added, and only while nobody has filled it in. Otherwise hide it.
export async function DELETE(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const { key } = await params;
  if (!KEY.test(key)) return NextResponse.json({ error: "not_found", code: "not_found" }, { status: 404 });
  try {
    await deleteFormItem(key);
    logAdminAction(request, admin, "buyer_form_item_removed", { targetType: "buyer_form", targetId: key });
    return NextResponse.json({ success: true });
  } catch (err) {
    return formErrorResponse(err);
  }
}
