import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { removeFavorite } from "@/lib/server/favorites-repo";

export async function DELETE(request: Request, { params }: { params: Promise<{ exhibitionId: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { exhibitionId } = await params;
  await removeFavorite(user.id, Number(exhibitionId));
  return NextResponse.json({ ok: true });
}
