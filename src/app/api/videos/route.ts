import { NextResponse } from "next/server";
import { listVideos, listVideosForRelated } from "@/lib/server/videos-repo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const relatedType = searchParams.get("relatedType");
  const relatedId = searchParams.get("relatedId");

  const videos =
    (relatedType === "exhibition" || relatedType === "tour") && relatedId
      ? await listVideosForRelated(relatedType, relatedId)
      : await listVideos();

  return NextResponse.json(
    { videos },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
