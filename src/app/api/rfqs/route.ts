import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { listRfqs, createRfq } from "@/lib/server/rfqs-repo";

export async function GET() {
  const rfqs = await listRfqs();
  return NextResponse.json({ rfqs });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.product) {
    return NextResponse.json({ error: "title and product are required" }, { status: 400 });
  }

  const id = await createRfq({ ...body, buyerId: user.id, buyerName: user.name });
  return NextResponse.json({ id }, { status: 201 });
}
