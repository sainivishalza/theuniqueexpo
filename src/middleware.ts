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
    // Built from scratch (path + query only) rather than mutating
    // request.url's host in place -- request.url reflects the app's
    // internal bind address (e.g. includes :3000 behind Hostinger's
    // proxy), and the URL.host setter leaves an existing port in place
    // when the assigned value has none, so `url.host = CANONICAL_HOST`
    // silently produced https://www.theuniqueexpo.com:3000/ instead of
    // the public URL.
    const destination = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      `https://${CANONICAL_HOST}`
    );
    return NextResponse.redirect(destination, 308);
  }
  const response = intlMiddleware(request);
  // Root layout's generateMetadata needs the current path (locale prefix
  // included) to build correct canonical/hreflang alternate tags per page,
  // but a Server Component has no direct way to read the request URL --
  // only middleware sees it. `response.headers.set()` would put this on
  // the *response* Next sends to the browser (confirmed live -- it was
  // leaking into every page's headers); NextResponse.next({request:
  // {headers}})'s `x-middleware-request-*`/`x-middleware-override-headers`
  // convention is what actually forwards a header into the request context
  // Server Components read via headers(), without exposing it to the
  // client. next-intl already built `response` for us, so replicate that
  // convention manually rather than reconstructing its whole response.
  response.headers.set("x-middleware-request-x-pathname", request.nextUrl.pathname);
  const overrideKeys = new Set(
    (response.headers.get("x-middleware-override-headers") || "").split(",").map((k) => k.trim()).filter(Boolean)
  );
  overrideKeys.add("x-pathname");
  response.headers.set("x-middleware-override-headers", Array.from(overrideKeys).join(","));
  return response;
}

export const config = {
  // Runs on every path except API routes, Next internals, static assets,
  // and files with an extension (favicon.ico, images, etc).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
