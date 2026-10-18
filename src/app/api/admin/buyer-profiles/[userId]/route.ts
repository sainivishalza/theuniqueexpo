import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getUserById } from "@/lib/server/users-repo";
import { getBuyerProfileOrEmpty, upsertBuyerProfileFields } from "@/lib/server/buyer-profile-repo";
import { setBuyerExpoIds } from "@/lib/server/buyer-expos-repo";

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { userId } = await params;
  const targetId = Number(userId);
  const target = await getUserById(targetId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const profile = await getBuyerProfileOrEmpty(targetId);
  return NextResponse.json({ user: target, profile });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { userId } = await params;
  const targetId = Number(userId);
  const target = await getUserById(targetId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const fields = [
    "companyName",
    "nationality",
    "passportNumber",
    "annualTurnover",
    "purchaseIntention",
    "otherPurchaseIntention",
    "contactPerson",
    "registrationCode",
    "departureCity",
    "attendanceDay",
    "meetingOrVisiting",
    "passportName",
    "gender",
    "wechatId",
    "overseasCompanyAddress",
    "companyField",
    "jobTitle",
    "contactEmail",
    "phoneNumber",
    "dateOfBirth",
    "visaType",
    "visaExpireDate",
  ] as const;
  const update: Record<string, string> = {};
  for (const field of fields) {
    if (typeof body[field] === "string") update[field] = body[field];
  }

  await upsertBuyerProfileFields(targetId, update);
  // Expos are picked from the Buyer Expos list (a multi-select), sent as ids.
  if (Array.isArray(body.expoIds)) {
    await setBuyerExpoIds(targetId, body.expoIds.map(Number));
  }
  const profile = await getBuyerProfileOrEmpty(targetId);
  return NextResponse.json({ profile });
}
