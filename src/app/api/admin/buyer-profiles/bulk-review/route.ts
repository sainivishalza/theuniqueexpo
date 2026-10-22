import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { requireAdmin } from "@/lib/auth-server";
import { bulkReviewDocuments, documentAccess } from "@/lib/server/buyer-profile-repo";
import { formErrorResponse } from "@/lib/server/buyer-form-api";
import { notifyDocumentRejected } from "@/lib/server/notifications";

const MAX_USER_IDS = 500;

// Review the documents of the selected buyers in one go: verify everything still waiting, or
// reject one document (with a reason) for those who uploaded it.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const userIds: number[] = Array.isArray(body?.userIds)
    ? Array.from(new Set<number>(body.userIds.filter((v: unknown): v is number => Number.isInteger(v) && (v as number) > 0)))
    : [];
  if (userIds.length === 0) return NextResponse.json({ error: "Select at least one buyer", code: "no_buyers" }, { status: 400 });
  if (userIds.length > MAX_USER_IDS) return NextResponse.json({ error: `Select at most ${MAX_USER_IDS} buyers`, code: "too_many" }, { status: 400 });

  const action = body?.action;
  if (action !== "verify" && action !== "reject") return NextResponse.json({ error: "Invalid action", code: "invalid_action" }, { status: 400 });

  let documentKey: string | null = null;
  let note = "";
  if (action === "reject") {
    documentKey = typeof body.documentKey === "string" ? body.documentKey : null;
    if (!documentKey || !(await documentAccess(documentKey)).exists) {
      return NextResponse.json({ error: "Choose a document", code: "invalid_document" }, { status: 400 });
    }
    note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    if (note.length < 3) return NextResponse.json({ error: "Give the reason the buyers will see", code: "reason_required" }, { status: 400 });
  }

  try {
    const { changed, rejectedUserIds } = await bulkReviewDocuments(userIds, action, documentKey, note);
    for (const id of rejectedUserIds) notifyDocumentRejected(id, documentKey as string, note);
    logAdminAction(request, admin, action === "verify" ? "documents_bulk_verified" : "documents_bulk_rejected", {
      targetType: "user",
      details: `${changed} documents of ${userIds.length} buyers${documentKey ? ` (${documentKey})` : ""}${note ? `: ${note}` : ""}`,
    });
    return NextResponse.json({ changed, buyers: userIds.length });
  } catch (err) {
    return formErrorResponse(err);
  }
}
