import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import { defaultConfirmBy, getRegistrationById, setRegistrationStatus } from "@/lib/server/expo-registrations-repo";
import { notifyRegistrationDecision } from "@/lib/server/notifications";
import { isRegistrationStatus, isValidDateOnly } from "@/lib/registration-lifecycle";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const registration = await getRegistrationById(Number(id));
  if (!registration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ registration });
}

// Change a registration's status. Approving can carry a confirm-by date (YYYY-MM-DD);
// without one the default is used (the day before the exhibition starts).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const { status, confirmBy } = (await request.json().catch(() => ({}))) as { status?: unknown; confirmBy?: unknown };
  if (!isRegistrationStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const registration = await getRegistrationById(Number(id));
  if (!registration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let deadline: string | null = null;
  if (status === "approved") {
    if (confirmBy !== undefined && confirmBy !== null && confirmBy !== "") {
      if (!isValidDateOnly(confirmBy)) {
        return NextResponse.json({ error: "Please enter a valid confirm-by date" }, { status: 400 });
      }
      deadline = confirmBy;
    } else {
      const exhibition = await getExhibitionBySlugOrId(String(registration.exhibitionId));
      deadline = exhibition ? defaultConfirmBy(exhibition.startDate, exhibition.endDate) : null;
    }
  }

  await setRegistrationStatus(Number(id), status, deadline);
  if ((status === "approved" || status === "rejected") && registration.status !== status) notifyRegistrationDecision(Number(id), status === "approved", deadline);
  const updated = await getRegistrationById(Number(id));
  return NextResponse.json({
    ok: true,
    status: updated?.status,
    effectiveStatus: updated?.effectiveStatus,
    confirmBy: updated?.confirmBy ?? null,
    approvedAt: updated?.approvedAt ?? null,
    confirmedAt: updated?.confirmedAt ?? null,
    checkedInAt: updated?.checkedInAt ?? null,
    checkedOutAt: updated?.checkedOutAt ?? null,
    cancelledAt: updated?.cancelledAt ?? null,
  });
}
