import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { documentAccess, getBuyerDocument, setBuyerDocument } from "@/lib/server/buyer-profile-repo";
import { formErrorResponse } from "@/lib/server/buyer-form-api";
import { isValidUploadedDocument, isAllowedImageContentType } from "@/lib/server/validate-upload";

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

  const match = /^data:([^;]+);base64,(.+)$/.exec(value);
  if (!match) return NextResponse.json({ error: "Malformed document data" }, { status: 500 });
  const [, contentType, base64Data] = match;

  // PDFs are allowed on upload (isValidUploadedDocument) but this route
  // only ever serves images back inline -- a stored PDF is instead just
  // linked to directly by its data: URL from the page that already has it.
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
