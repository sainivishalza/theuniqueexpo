import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { createBuyerExpo, listBuyerExpos, ExpoNameError } from "@/lib/server/buyer-expos-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  return NextResponse.json({ expos: await listBuyerExpos() });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  try {
    const expo = await createBuyerExpo(body?.name);
    return NextResponse.json({ expo }, { status: 201 });
  } catch (err) {
    if (err instanceof ExpoNameError) return NextResponse.json({ error: err.code }, { status: 400 });
    console.error("Create buyer expo failed:", err);
    return NextResponse.json({ error: "Could not create expo" }, { status: 500 });
  }
}
