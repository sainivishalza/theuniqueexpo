import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import {
  DOCUMENT_FIELDS,
  type DocumentField,
  type DocumentReviewStatus,
  getBuyerDocument,
  setBuyerDocument,
  setDocumentReview,
} from "@/lib/server/buyer-profile-repo";
import { isValidUploadedDocument, isAllowedImageContentType } from "@/lib/server/validate-upload";

function isDocumentField(value: string): value is DocumentField {
  return (DOCUMENT_FIELDS as readonly string[]).includes(value);
}

const REVIEW_STATUSES: readonly DocumentReviewStatus[] = ["pending", "verified", "rejected"];
function isReviewStatus(value: unknown): value is DocumentReviewStatus {
  return typeof value === "string" && (REVIEW_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: Request, { params }: { params: Promise<{ userId: string; type: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { userId, type } = await params;
  if (!isDocumentField(type)) return NextResponse.json({ error: "Unknown document type" }, { status: 404 });

  const value = await getBuyerDocument(Number(userId), type);
  if (!value) return NextResponse.json({ error: "No document uploaded" }, { status: 404 });

  const match = /^data:([^;]+);base64,(.+)$/.exec(value);
  if (!match) return NextResponse.json({ error: "Malformed document data" }, { status: 500 });
  const [, contentType, base64Data] = match;
  if (!isAllowedImageContentType(contentType)) {
    return NextResponse.json({ error: "Unsupported content type for inline serving" }, { status: 415 });
  }
  const bytes = Buffer.from(base64Data, "base64");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(bytes.length),
    },
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string; type: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { userId, type } = await params;
  if (!isDocumentField(type)) return NextResponse.json({ error: "Unknown document type" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const value = body?.value;
  if (!isValidUploadedDocument(value)) {
    return NextResponse.json({ error: "Invalid file -- must be an image or PDF under 8MB" }, { status: 400 });
  }

  await setBuyerDocument(Number(userId), type, value);
  return NextResponse.json({ success: true });
}

// Admin marking a document verified or rejected (with an optional short
// reason the buyer sees on their own profile page) -- separate from PUT,
// which replaces the file itself and always resets review back to pending.
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string; type: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { userId, type } = await params;
  if (!isDocumentField(type)) return NextResponse.json({ error: "Unknown document type" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || !isReviewStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status -- must be pending, verified, or rejected" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

  await setDocumentReview(Number(userId), type, body.status, note);
  return NextResponse.json({ success: true });
}
