import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Runs on every path except API routes, Next internals, static assets,
  // and files with an extension (favicon.ico, images, etc).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
