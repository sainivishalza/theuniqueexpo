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

  const id = await createTourApplication({ ...body, userId: user.id });
  return NextResponse.json({ id }, { status: 201 });
}
