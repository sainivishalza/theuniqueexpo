import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import { inviteColleagues, listInvites, MAX_PER_REQUEST, parseInviteList } from "@/lib/server/group-invites";
import { asLocale, detectLocale } from "@/lib/server/notifications";
import { checkRateLimit } from "@/lib/server/rate-limit";

// Group registration: invite colleagues to register for the exhibition this registration is for.

async function loadOwned(request: Request, idParam: string) {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: "Please sign in", code: "unauthorized" }, { status: 401 }) } as const;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { error: NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 }) } as const;
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT exhibition_id, status FROM expo_registrations WHERE id = ? AND user_id = ? LIMIT 1",
    [id, user.id]
  );
  if (!rows[0]) return { error: NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 }) } as const;
  return { user, exhibitionId: Number(rows[0].exhibition_id), status: String(rows[0].status) } as const;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owned = await loadOwned(request, (await params).id);
  if ("error" in owned) return owned.error;
  return NextResponse.json({ invites: await listInvites(owned.user.id, owned.exhibitionId) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owned = await loadOwned(request, (await params).id);
  if ("error" in owned) return owned.error;
  const { user } = owned;
  // Only someone whose own registration is going ahead can invite colleagues.
  if (!["pending", "approved", "confirmed", "attended"].includes(owned.status)) {
    return NextResponse.json({ error: "Invitations are not available for this registration", code: "not_available" }, { status: 409 });
  }
  const exhibition = await getExhibitionBySlugOrId(String(owned.exhibitionId));
  if (!exhibition || !exhibition.registrationEnabled) {
    return NextResponse.json({ error: "Registration for this exhibition is closed", code: "registration_closed" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof (body as { emails?: unknown }).emails === "string" ? (body as { emails: string }).emails : "";
  if (text.length > 4000) return NextResponse.json({ error: "Too long", code: "too_long" }, { status: 400 });
  const [accountRows] = await pool.query<RowDataPacket[]>("SELECT email FROM users WHERE id = ? LIMIT 1", [user.id]);
  const { entries, invalid } = parseInviteList(text, String(accountRows[0]?.email ?? ""));
  if (entries.length === 0) return NextResponse.json({ error: "Please enter at least one valid e-mail address", code: "no_valid_emails", invalid }, { status: 400 });
  if (entries.length > MAX_PER_REQUEST) return NextResponse.json({ error: `You can invite up to ${MAX_PER_REQUEST} colleagues at a time`, code: "too_many", max: MAX_PER_REQUEST }, { status: 400 });

  // Only real invitations count (5 requests an hour), not mistyped lists.
  const limited = await checkRateLimit(`group-invite:${user.id}`, 5, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many invitations, try again later", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });

  const [profile] = await pool.query<RowDataPacket[]>("SELECT company_name FROM buyer_profiles WHERE user_id = ? LIMIT 1", [user.id]).catch(() => [[] as RowDataPacket[]]);
  const locale = asLocale(detectLocale(request));
  const { results, mailOn } = await inviteColleagues(
    { id: user.id, name: user.name, company: String(profile[0]?.company_name ?? "") },
    { id: Number(exhibition.id), title: exhibition.title, slug: exhibition.slug },
    entries,
    locale
  );
  return NextResponse.json({ results, invalid, mailOn, invites: await listInvites(user.id, owned.exhibitionId) });
}
