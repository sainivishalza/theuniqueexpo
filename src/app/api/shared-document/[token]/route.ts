import { NextResponse } from "next/server";
import { openShareLink } from "@/lib/server/document-share";
import { documentResponse } from "@/lib/server/document-response";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

// Shows one buyer document to whoever has the link an admin made, until it expires or is revoked. An unknown, expired
// and revoked link all answer the same 404. The answer is never cached and never indexed.
const HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limited = await rateLimitOrNull(request, "shared-document", 60, 60_000);
  if (limited) return limited;
  const { token } = await params;
  const value = await openShareLink(token);
  if (!value) return NextResponse.json({ error: "This link does not work any more" }, { status: 404, headers: HEADERS });
  const response = await documentResponse(value);
  for (const [name, v] of Object.entries(HEADERS)) response.headers.set(name, v);
  return response;
}
