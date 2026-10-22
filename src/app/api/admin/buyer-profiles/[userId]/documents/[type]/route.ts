import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import {
  documentAccess,
  type DocumentReviewStatus,
  getBuyerDocument,
  setBuyerDocument,
  setDocumentReview,
} from "@/lib/server/buyer-profile-repo";
import { isValidUploadedDocument } from "@/lib/server/validate-upload";
import { documentResponse } from "@/lib/server/document-response";
import { formErrorResponse } from "@/lib/server/buyer-form-api";
import { notifyDocumentRejected } from "@/lib/server/notifications";

// An admin can open any document that exists, shown to buyers or hidden.
async function isKnownDocument(value: string): Promise<boolean> {
  return (await documentAccess(value)).exists;
}

const REVIEW_STATUSES: readonly DocumentReviewStatus[] = ["pending", "verified", "rejected"];
function isReviewStatus(value: unknown): value is DocumentReviewStatus {
  return typeof value === "string" && (REVIEW_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: Request, { params }: { params: Promise<{ userId: string; type: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { userId, type } = await params;
  if (!(await isKnownDocument(type))) return NextResponse.json({ error: "Unknown document type" }, { status: 404 });

  const value = await getBuyerDocument(Number(userId), type);
  if (!value) return NextResponse.json({ error: "No document uploaded" }, { status: 404 });

  // ?thumb=1 sends a small preview for the lists instead of the whole picture.
  return documentResponse(value, { thumb: new URL(request.url).searchParams.get("thumb") === "1" });
}

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string; type: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { userId, type } = await params;
  if (!(await isKnownDocument(type))) return NextResponse.json({ error: "Unknown document type" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const value = body?.value;
  if (!isValidUploadedDocument(value)) {
    return NextResponse.json({ error: "Invalid file -- must be an image or PDF under 8MB" }, { status: 400 });
  }

  try {
    await setBuyerDocument(Number(userId), type, value);
  } catch (err) {
    return formErrorResponse(err);
  }
  return NextResponse.json({ success: true });
}

// Admin marking a document verified or rejected (with an optional short
// reason the buyer sees on their own profile page) -- separate from PUT,
// which replaces the file itself and always resets review back to pending.
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string; type: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { userId, type } = await params;
  if (!(await isKnownDocument(type))) return NextResponse.json({ error: "Unknown document type" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || !isReviewStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status -- must be pending, verified, or rejected" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

  try {
    await setDocumentReview(Number(userId), type, body.status, note);
    if (body.status === "rejected") notifyDocumentRejected(Number(userId), type, note);
  } catch (err) {
    return formErrorResponse(err);
  }
  return NextResponse.json({ success: true });
}
