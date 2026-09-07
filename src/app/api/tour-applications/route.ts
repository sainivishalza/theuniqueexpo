import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createTourApplication } from "@/lib/server/service-apps-repo";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await request.json();
  if (!body.tourId || !body.name || !body.email) {
    return NextResponse.json({ error: "tourId, name, and email are required" }, { status: 400 });
  }
  const travelers = Number(body.travelers);
  if (body.travelers !== undefined && (!Number.isInteger(travelers) || travelers < 1)) {
    return NextResponse.json({ error: "travelers must be a whole number of at least 1" }, { status: 400 });
  }

  const id = await createTourApplication({
    ...body,
    travelers: Number.isInteger(travelers) && travelers >= 1 ? travelers : 1,
    services: Array.isArray(body.services) ? body.services.filter((s: unknown) => typeof s === "string") : [],
    userId: user.id,
  });
  return NextResponse.json({ id }, { status: 201 });
}
