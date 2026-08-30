import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listExhibitions, createExhibition } from "@/lib/server/exhibitions-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const exhibitions = await listExhibitions();
  return NextResponse.json({ exhibitions });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.slug || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: "title, slug, startDate, and endDate are required" }, { status: 400 });
  }

  try {
    const id = await createExhibition(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "An exhibition with that slug already exists" }, { status: 409 });
    }
    console.error("Create exhibition error:", err);
    return NextResponse.json({ error: "Failed to create exhibition" }, { status: 500 });
  }
}
