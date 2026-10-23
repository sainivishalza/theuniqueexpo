import { NextResponse } from "next/server";
import { recordError } from "@/lib/server/error-log";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

// A script error in a visitor's browser (sent by ClientErrorReporter). Anyone can call it, so it is small, limited per address,
// and only ever grouped into the error list; it never answers with anything useful to a caller.
export async function POST(request: Request) {
  const limited = await rateLimitOrNull(request, "client-error", 20, 60 * 60_000, { memoryOnly: true });
  if (limited) return new NextResponse(null, { status: 204 });
  const text = await request.text().catch(() => "");
  if (text.length > 6000) return new NextResponse(null, { status: 204 });
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const b = body as { message?: unknown; stack?: unknown; page?: unknown };
  if (typeof b?.message !== "string") return new NextResponse(null, { status: 204 });
  let path = "";
  if (typeof b.page === "string") {
    try {
      path = new URL(b.page, "https://x.invalid").pathname.slice(0, 200);
    } catch {
      path = "";
    }
  }
  await recordError({ source: "client", message: b.message, detail: typeof b.stack === "string" ? b.stack : "", path, userAgent: request.headers.get("user-agent") ?? "" });
  return new NextResponse(null, { status: 204 });
}
