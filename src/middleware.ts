import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// The apex domain and www were both serving the site independently (no
// redirect either way), which lets search engines index the same content
// under two hosts and split ranking signals between them. www is the
// canonical host (see sitemap.ts/robots.ts/layout.tsx) -- apex requests
// get a permanent redirect there before next-intl's own locale handling
// runs.
const APEX_HOST = "theuniqueexpo.com";
const CANONICAL_HOST = "www.theuniqueexpo.com";

export default function middleware(request: NextRequest) {
  if (request.headers.get("host") === APEX_HOST) {
    const url = new URL(request.url);
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }
  return intlMiddleware(request);
}

export const config = {
  // Runs on every path except API routes, Next internals, static assets,
  // and files with an extension (favicon.ico, images, etc).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
