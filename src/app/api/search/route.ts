import { NextResponse } from "next/server";
import { rateLimitOrNull } from "@/lib/server/rate-limit";
import { siteSearch } from "@/lib/server/site-search";

const LOCALES = ["en", "ru", "zh"];

// Public site search: ?q=words&locale=en. At least two characters; at most 80 are used.
export async function GET(request: Request) {
  const limited = await rateLimitOrNull(request, "site-search", 60, 60_000, { memoryOnly: true });
  if (limited) return limited;
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 80);
  const locale = LOCALES.includes(params.get("locale") ?? "") ? (params.get("locale") as string) : "en";
  if (query.length < 2 && !/[\u3400-\u9fff]/.test(query)) return NextResponse.json({ groups: [] });
  try {
    return NextResponse.json({ groups: await siteSearch(query, locale) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Site search error:", err);
    return NextResponse.json({ error: "Search is not available right now." }, { status: 500 });
  }
}
