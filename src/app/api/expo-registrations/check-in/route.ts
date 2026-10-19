import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import { checkInOrOut, getMyRegistration, type CheckInOutcome } from "@/lib/server/expo-registrations-repo";
import { isValidCheckInKey } from "@/lib/server/expo-checkin";
import { checkRateLimit } from "@/lib/server/rate-limit";

// Scanning the QR code at the venue. The key in the QR code proves the person is
// at (or was given the code for) this exhibition; the registration proves who they are.

// `locale` only changes how the exhibition's title and dates are written for the page.
async function resolve(request: Request, slug: unknown, key: unknown, locale?: string) {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: "Please sign in" }, { status: 401 }) } as const;
  if (typeof slug !== "string" || !slug) return { error: NextResponse.json({ error: "Missing exhibition" }, { status: 400 }) } as const;
  const exhibition = await getExhibitionBySlugOrId(slug, locale);
  if (!exhibition) return { error: NextResponse.json({ error: "Exhibition not found" }, { status: 404 }) } as const;
  if (!isValidCheckInKey(Number(exhibition.id), key)) {
    return { error: NextResponse.json({ error: "This QR code isn't valid for this exhibition", outcome: "invalid_key" }, { status: 403 }) } as const;
  }
  return { user, exhibition } as const;
}

// Read-only: what the check-in page shows before anything is pressed.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resolved = await resolve(request, searchParams.get("exhibition"), searchParams.get("k"), searchParams.get("locale") || undefined);
  if ("error" in resolved) return resolved.error;
  const { user, exhibition } = resolved;
  const registration = await getMyRegistration(Number(exhibition.id), user.id);
  return NextResponse.json({ exhibition: { slug: exhibition.slug, title: exhibition.title, dates: exhibition.dates }, registration });
}

const STATUS_BY_OUTCOME: Record<CheckInOutcome, number> = {
  checked_in: 200,
  checked_out: 200,
  no_registration: 404,
  not_confirmed: 409,
  outside_dates: 409,
  already_done: 409,
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { exhibition?: unknown; k?: unknown; action?: unknown };
    const resolved = await resolve(request, body.exhibition, body.k);
    if ("error" in resolved) return resolved.error;
    const { user, exhibition } = resolved;

    if (body.action !== "check_in" && body.action !== "check_out") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const { allowed, retryAfterSeconds } = checkRateLimit(`checkin:${user.id}`, 20, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
    }

    const outcome = await checkInOrOut(Number(exhibition.id), user.id, body.action);
    const registration = await getMyRegistration(Number(exhibition.id), user.id);
    return NextResponse.json({ outcome, registration }, { status: STATUS_BY_OUTCOME[outcome] });
  } catch (err) {
    console.error("Expo check-in error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
