import type { NextRequest } from "next/server";

// Public content pages (the same list as the CDN rules in next.config.js): the language is in their address, so
// they never need to set the language cookie, and a response that sets a cookie is never kept by a CDN.
const PUBLIC_PAGE = new RegExp(
  "^/(en|ru|zh)(/(about|api-documentation|blog|booth-setup-tips|business-tours|careers|china-travel|city-partnerships|contact|cookies|events|exhibition-guide|exhibitions|help|magazine|partner-program|partner-with-us|plan-business-trip|privacy|relocation|services|terms|tours|videos)(/[^/]+)*)?/?$"
);
const PERSONAL_STEP = /\/(register|apply|check-in)(\/|$)/;

/** A page view of a public content page by someone who is not signed in. */
export function isAnonymousPublicPageView(request: Pick<NextRequest, "method" | "headers" | "nextUrl">): boolean {
  if (request.method !== "GET") return false;
  const { pathname } = request.nextUrl;
  if (!PUBLIC_PAGE.test(pathname) || PERSONAL_STEP.test(pathname)) return false;
  return !/(^|;\s*)token=/.test(request.headers.get("cookie") ?? "");
}
