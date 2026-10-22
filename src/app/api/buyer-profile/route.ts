import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getBuyerNumber } from "@/lib/server/buyer-numbers";
import { getBuyerProfileOrEmpty, upsertBuyerProfileFields } from "@/lib/server/buyer-profile-repo";
import { setCustomValues } from "@/lib/server/buyer-form-repo";
import { formErrorResponse } from "@/lib/server/buyer-form-api";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const profile = await getBuyerProfileOrEmpty(user.id);
  // The buyer's own registration number (TUE0001), to quote when contacting us.
  return NextResponse.json({ profile, buyerNumber: await getBuyerNumber(user.id) });
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

  // Answers to the extra fields an admin added: checked against each field, and refused as a whole if one does not fit.
  try {
    if (body.custom && typeof body.custom === "object" && !Array.isArray(body.custom)) await setCustomValues(user.id, body.custom);
  } catch (err) {
    return formErrorResponse(err);
  }
  await upsertBuyerProfileFields(user.id, update);
  const profile = await getBuyerProfileOrEmpty(user.id);
  return NextResponse.json({ profile });
}
