const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Admins can paste any external image URL for a poster or hero image
    // (not just Unsplash), so a fixed allowlist of hostnames would break
    // those uploads. Restricting to https still blocks the most common
    // SSRF targets (plain-http internal/metadata endpoints); the images.*
    // fields are only ever set by authenticated admins, not public users.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // The exhibition poster/gallery endpoints append a ?v=<updated_at>
    // cache-busting query string (see exhibitions-repo.ts) -- Next 16
    // rejects local image srcs with a query string unless explicitly
    // allowed here. `search` is intentionally omitted so any ?v= value
    // matches, since it changes on every re-upload.
    localPatterns: [{ pathname: "/api/exhibitions/**" }, { pathname: "/api/tours/**" }],
  },
  experimental: {
    // Defaults to os.cpus().length - 1, which on shared hosting reports the
    // host's full core count (60+) rather than what the account can actually
    // spawn — the build then hits the account's process-spawn limit (EAGAIN)
    // while collecting page data. Cap it low so builds succeed there.
    cpus: 2,
  },
  async headers() {
    return [
      {
        // Applies to every route. CSP keeps 'unsafe-inline' for style-src
        // deliberately -- the admin-controlled site theme (colors, fonts,
        // corner radius) works by setting CSS custom properties via a
        // React inline `style` attribute on <html> and other elements
        // (see src/app/[locale]/layout.tsx), which a stricter style-src
        // would block outright. script-src keeps 'unsafe-inline' for the
        // same reason Next/GA need it here (GoogleAnalytics.tsx's inline
        // gtag init script) without wiring up a nonce.
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https: data:",
              "font-src 'self' data:",
              "connect-src 'self' https://www.google-analytics.com https://analytics.google.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      {
        // Admin pages are auth-gated, client-rendered dashboards -- they must
        // never be served from a long-lived edge/CDN cache, or a redeploy's
        // changes (styling, features) can appear "stuck" on stale content.
        // Pages now sit under a /:locale prefix (see src/i18n/routing.ts).
        source: "/:locale/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        // Per-exhibition registration is auth-gated and per-user (prefilled
        // from the visitor's own past submissions) -- must never be cached.
        source: "/:locale/exhibitions/:slug/register",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/:locale/tours/:slug/register",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/api/expo-registrations/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/api/tour-registrations/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
