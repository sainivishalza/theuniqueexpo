import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getRfqById, listQuotesForRfq, createQuote } from "@/lib/server/rfqs-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

// Quotes are intentionally public (the marketplace UI shows them to signed-
// out visitors browsing a single RFQ, by design), but with no auth at all
// an anonymous scraper can enumerate every RFQ id and harvest all quote
// pricing/notes platform-wide -- rate-limit by IP to slow that down
// without breaking normal single-RFQ browsing.
const QUOTES_READ_LIMIT = 60;
const QUOTES_READ_WINDOW_MS = 60 * 1000;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimitOrNull(request, "rfq-quotes-read", QUOTES_READ_LIMIT, QUOTES_READ_WINDOW_MS);
  if (limited) return limited;

  const { id } = await params;
  const quotes = await listQuotesForRfq(Number(id));
  return NextResponse.json({ quotes });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (user.role !== "exhibitor") {
    return NextResponse.json({ error: "Only exhibitors can submit quotes" }, { status: 403 });
  }

  const { id } = await params;
  const rfq = await getRfqById(Number(id));
  if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });

  const body = await request.json();
  if (!body.price || !body.leadTime) {
    return NextResponse.json({ error: "price and leadTime are required" }, { status: 400 });
  }

  const quoteId = await createQuote({
    rfqId: Number(id),
    exhibitorId: user.id,
    exhibitorName: user.name,
    price: body.price,
    leadTime: body.leadTime,
    notes: body.notes || "",
  });
  return NextResponse.json({ id: quoteId }, { status: 201 });
}
