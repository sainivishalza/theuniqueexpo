import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getLatestRegistrationForUser } from "@/lib/server/expo-registrations-repo";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const registration = await getLatestRegistrationForUser(user.id);
  return NextResponse.json({ registration });
}
