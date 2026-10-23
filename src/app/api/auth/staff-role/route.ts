import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getStaffPreset } from "@/lib/server/staff-access";
import { mustSetUpTwoStep } from "@/lib/server/admin-security";

// The back-office role of the signed-in admin (the admin menu shows only what that role may open). Anyone else: null.
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ preset: null });
  // twoStepRequired: the rule "every admin needs two-step" is on and this admin has not set it up (the admin screens then only offer the account page).
  return NextResponse.json({ preset: await getStaffPreset(user.id), twoStepRequired: await mustSetUpTwoStep(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
