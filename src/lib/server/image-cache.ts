// How long an uploaded picture served by an API route may be kept. The lists point at these pictures with "?v=<time of the last
// change>", so a picture asked for with that "v" can never change under the same address: browsers and the CDN may keep it for a
// year. Without "v" (an old link) it is kept for an hour only.
export function imageCacheControl(request: Request): string {
  return new URL(request.url).searchParams.has("v")
    ? "public, max-age=31536000, s-maxage=31536000, immutable"
    : "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";
}
