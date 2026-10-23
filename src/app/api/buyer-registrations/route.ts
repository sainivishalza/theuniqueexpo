import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { asLocale } from "@/lib/server/notifications";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { listRegistrable, submitRegistrations } from "@/lib/server/bulk-registration";
import { MAX_EXHIBITIONS_AT_ONCE } from "@/lib/bulk-registration";

const noStore = { "Cache-Control": "no-store" };

async function buyer(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return { response: NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 }) };
  if (user.role !== "buyer") return { response: NextResponse.json({ error: "buyers_only", code: "buyers_only" }, { status: 403 }) };
  return { user };
}

function parseSlugs(body: unknown): string[] | null {
  const raw = (body as { slugs?: unknown } | null)?.slugs;
  if (!Array.isArray(raw)) return null;
  const slugs = Array.from(new Set(raw.filter((s): s is string => typeof s === "string" && s.length > 0 && s.length <= 200)));
  if (slugs.length === 0 || slugs.length > MAX_EXHIBITIONS_AT_ONCE) return null;
  return slugs;
}

// The upcoming exhibitions open for registration, with where this buyer stands on each.
export async function GET(request: Request) {
  const auth = await buyer(request);
  if (auth.response) return auth.response;
  const locale = asLocale(new URL(request.url).searchParams.get("locale"));
  return NextResponse.json({ exhibitions: await listRegistrable(auth.user.id, locale) }, { headers: noStore });
}

// Registers the buyer for the chosen exhibitions at once. { slugs: [...], answers: { <question key>: answer } }
export async function POST(request: Request) {
  const auth = await buyer(request);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  const slugs = parseSlugs(body);
  if (!slugs) return NextResponse.json({ error: "invalid_input", code: "invalid_input" }, { status: 400 });
  const answers = body?.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? (body.answers as Record<string, unknown>) : {};
  const limited = await checkRateLimit(`bulk-register:${auth.user.id}`, 30, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const outcome = await submitRegistrations(
    { id: auth.user.id, name: auth.user.name, email: auth.user.email },
    slugs,
    answers,
    asLocale(body?.locale)
  );
  if (outcome.error) return NextResponse.json({ error: outcome.error.code, ...outcome.error }, { status: 400, headers: noStore });
  return NextResponse.json({ results: outcome.results }, { headers: noStore });
}
