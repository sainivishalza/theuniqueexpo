import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { getExhibitionBySlugOrId, updateRegistrationFormConfig } from "@/lib/server/exhibitions-repo";
import { isDay, MAX_BUYER_QUOTA } from "@/lib/registration-window";
import { placeSummary, promoteFromWaitlist } from "@/lib/server/waitlist";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const exhibition = await getExhibitionBySlugOrId(id);
  if (!exhibition) return NextResponse.json({ error: "Exhibition not found" }, { status: 404 });

  return NextResponse.json({
    exhibition: { id: exhibition.id, title: exhibition.title, slug: exhibition.slug },
    // The admin's own switch (not "open right now": the dates below can close it too).
    registrationEnabled: exhibition.registrationSwitchedOn,
    registrationOpens: exhibition.registrationOpens,
    registrationCloses: exhibition.registrationCloses,
    buyerQuota: exhibition.buyerQuota,
    series: exhibition.series,
    registrationState: exhibition.registrationState,
    places: await placeSummary(Number(exhibition.id)),
    registrationFormSchema: exhibition.registrationFormSchema,
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const exhibition = await getExhibitionBySlugOrId(id);
  if (!exhibition) return NextResponse.json({ error: "Exhibition not found" }, { status: 404 });

  const body = await request.json();
  const { registrationEnabled, registrationFormSchema } = body;

  // The opening / closing days are optional; both inclusive; the last day cannot be before the first.
  const opens = body.registrationOpens === undefined || body.registrationOpens === null || body.registrationOpens === "" ? null : body.registrationOpens;
  const closes = body.registrationCloses === undefined || body.registrationCloses === null || body.registrationCloses === "" ? null : body.registrationCloses;
  if ((opens !== null && !isDay(opens)) || (closes !== null && !isDay(closes))) {
    return NextResponse.json({ error: "Please enter valid dates", code: "invalid_date" }, { status: 400 });
  }
  if (opens && closes && closes < opens) {
    return NextResponse.json({ error: "The last day to register cannot be before the day registration opens", code: "closes_before_opens" }, { status: 400 });
  }
  const rawQuota = body.buyerQuota === undefined || body.buyerQuota === null || body.buyerQuota === "" ? 0 : Number(body.buyerQuota);
  if (!Number.isInteger(rawQuota) || rawQuota < 0 || rawQuota > MAX_BUYER_QUOTA) {
    return NextResponse.json({ error: "The number of places must be a whole number (0 for no limit)", code: "invalid_quota" }, { status: 400 });
  }

  const series = typeof body.series === "string" ? body.series.trim() : "";
  if (series.length > 100) return NextResponse.json({ error: "The series name can be at most 100 characters", code: "series_too_long" }, { status: 400 });

  await updateRegistrationFormConfig(Number(exhibition.id), {
    registrationEnabled: !!registrationEnabled,
    registrationFormSchema: registrationFormSchema || null,
    registrationOpens: opens,
    registrationCloses: closes,
    buyerQuota: rawQuota,
    series,
  });
  logAdminAction(request, admin, "exhibition_registration_settings", {
    targetType: "exhibition",
    targetId: exhibition.id,
    details: `${exhibition.title}: ${registrationEnabled ? "on" : "off"}, opens ${opens ?? "-"}, closes ${closes ?? "-"}, places ${rawQuota || "no limit"}, series ${series || "-"}`,
  });
  // More places (or none to count any more) may let buyers off the waiting list.
  promoteFromWaitlist(Number(exhibition.id)).catch((err) => console.error("Waiting list promotion failed:", err));

  return NextResponse.json({ ok: true });
}
