import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { listFavoriteExhibitions, listFavoriteIds, addFavorite } from "@/lib/server/favorites-repo";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  if (searchParams.get("idsOnly") === "true") {
    const ids = await listFavoriteIds(user.id);
    return NextResponse.json({ exhibitionIds: ids });
  }

  const exhibitions = await listFavoriteExhibitions(user.id, searchParams.get("locale") || undefined);
  return NextResponse.json({ exhibitions });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await request.json();
  const exhibitionId = Number(body.exhibitionId);
  if (!exhibitionId) return NextResponse.json({ error: "exhibitionId is required" }, { status: 400 });

  await addFavorite(user.id, exhibitionId);
  return NextResponse.json({ ok: true }, { status: 201 });
}
