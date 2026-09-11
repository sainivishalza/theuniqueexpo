import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getBuyerProfileOrEmpty, upsertBuyerProfileFields } from "@/lib/server/buyer-profile-repo";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const profile = await getBuyerProfileOrEmpty(user.id);
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

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
  ] as const;
  const update: Record<string, string> = {};
  for (const field of fields) {
    if (typeof body[field] === "string") update[field] = body[field];
  }

  await upsertBuyerProfileFields(user.id, update);
  const profile = await getBuyerProfileOrEmpty(user.id);
  return NextResponse.json({ profile });
}
