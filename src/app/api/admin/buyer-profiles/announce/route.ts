import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { requireAdmin } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { describeSegment, parseSegment, resolveSegment } from "@/lib/server/announcement-segments";
import { sendAnnouncement, type AnnouncementTexts, type EmailLocale } from "@/lib/server/notifications";

const MAX_USER_IDS = 500;
const LOCALES: EmailLocale[] = ["en", "ru", "zh"];

// Publishes one announcement to the selected buyers on the website, and e-mails it too when e-mail is on (in
// their own language where the admin wrote it).
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  // Either the ticked buyers (up to 500), or a group worked out here from an exhibition, a registration status and a country.
  let userIds: number[] = [];
  let groupNote = "";
  if (body?.segment !== undefined) {
    const segment = parseSegment(body.segment);
    if (!segment) return NextResponse.json({ error: "bad_segment", code: "bad_segment" }, { status: 400 });
    const found = await resolveSegment(segment);
    if (found.tooMany) return NextResponse.json({ error: "too_many", code: "too_many" }, { status: 400 });
    userIds = found.ids;
    groupNote = ` (group: ${describeSegment(segment)})`;
  } else {
    userIds = Array.isArray(body?.userIds)
      ? Array.from(new Set<number>(body.userIds.filter((v: unknown): v is number => Number.isInteger(v) && (v as number) > 0)))
      : [];
    if (userIds.length > MAX_USER_IDS) return NextResponse.json({ error: "too_many", code: "too_many" }, { status: 400 });
  }
  if (userIds.length === 0) return NextResponse.json({ error: "no_buyers", code: "no_buyers" }, { status: 400 });

  const texts: AnnouncementTexts = { subject: { en: "", ru: "", zh: "" }, message: { en: "", ru: "", zh: "" } };
  for (const l of LOCALES) {
    const subject = typeof body?.subject?.[l] === "string" ? body.subject[l].trim() : "";
    const message = typeof body?.message?.[l] === "string" ? body.message[l].trim() : "";
    if (subject.length > 150 || message.length > 5000 || /[\r\n]/.test(subject)) return NextResponse.json({ error: "too_long", code: "too_long" }, { status: 400 });
    texts.subject[l] = subject;
    texts.message[l] = message;
  }
  // English is the language everyone falls back to, so it is required.
  if (texts.subject.en.length < 3 || texts.message.en.length < 5) return NextResponse.json({ error: "english_required", code: "english_required" }, { status: 400 });

  // Only real sends count towards the limit (5 per hour per admin), not refused or mistyped requests.
  const limited = await checkRateLimit(`announce:${admin.id}`, 5, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });

  const result = await sendAnnouncement(userIds, texts);
  logAdminAction(request, admin, "announcement_sent", { targetType: "user", details: `${userIds.length} buyers${groupNote}${result.mailOn ? "" : " (website only, e-mail is off)"}: ${texts.subject.en}` });
  return NextResponse.json(result);
}
