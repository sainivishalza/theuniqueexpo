import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { documentAccess, getBuyerDocument, setBuyerDocument } from "@/lib/server/buyer-profile-repo";
import { formErrorResponse } from "@/lib/server/buyer-form-api";
import { isValidUploadedDocument } from "@/lib/server/validate-upload";
import { documentResponse } from "@/lib/server/document-response";

// A buyer can only see and upload the documents currently asked for (not a hidden one).
async function isShownDocument(value: string): Promise<boolean> {
  const access = await documentAccess(value);
  return access.exists && access.active;
}

// Serves the buyer's own document as the actual file (same reasoning as
// /api/team-members/[id]/photo) instead of making every page load carry
// every document's base64 data inline.
export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { type } = await params;
  if (!(await isShownDocument(type))) return NextResponse.json({ error: "Unknown document type" }, { status: 404 });

  const value = await getBuyerDocument(user.id, type);
  if (!value) return NextResponse.json({ error: "No document uploaded" }, { status: 404 });

  return documentResponse(value);
}

export async function PUT(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { type } = await params;
  if (!(await isShownDocument(type))) return NextResponse.json({ error: "Unknown document type" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const value = body?.value;
  if (!isValidUploadedDocument(value)) {
    return NextResponse.json({ error: "Invalid file -- must be an image or PDF under 8MB" }, { status: 400 });
  }

  try {
    await setBuyerDocument(user.id, type, value);
  } catch (err) {
    return formErrorResponse(err);
  }
  return NextResponse.json({ success: true });
}
