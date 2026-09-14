import { NextResponse } from "next/server";
import { listSlideshowPhotos } from "@/lib/server/homepage-slideshow-repo";

export async function GET() {
  const photos = await listSlideshowPhotos();
  // Public, rarely-changing data -- same caching as /api/exhibitions.
  return NextResponse.json(
    { photos },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
