const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Framework/version fingerprinting -- off by default upstream would be
  // nicer, but Next.js sends this unless explicitly disabled.
  poweredByHeader: false,
  // Confirmed live in production (via a temporary diagnostics endpoint):
  // node_modules/tesseract.js was entirely absent from the deployed app,
  // even though node_modules itself exists and tesseract.js is a regular
  // (non-dev) dependency -- Next's build-time file tracing decides which
  // node_modules files actually ship, and tesseract.js's Node worker
  // adapter (spawnWorker.js) resolves its worker script's path as a
  // runtime string (`path.join(__dirname, ...)`) rather than a static
  // `require()`/`import`, so the tracer can't see that dependency and
  // prunes the package away entirely. createWorker() itself still works
  // (it's a static import, so its own code gets bundled), but the
  // `new Worker(workerPath)` call inside it then points at a file that
  // was never deployed -- which is why every OCR run hung indefinitely
  // instead of erroring: the thread spawns but has no script to execute.
  //
  // Including just node_modules/tesseract.js/** (below) got the worker
  // script itself deployed, but createWorker() *still* hung identically
  // afterward -- because that script's own top-level requires reach
  // several more packages the tracer can't see either, for the same
  // reason (all only ever required from inside the worker thread's
  // runtime-resolved entry file, never from this app's own static import
  // graph): tesseract.js-core (the actual WASM OCR engine, ~44MB),
  // wasm-feature-detect, regenerator-runtime, is-url, and node-fetch.
  // Force-including all of them so nothing the worker thread needs is
  // missing this time, rather than chasing one broken `require()` per
  // deploy cycle.
  outputFileTracingIncludes: {
    "/api/admin/photo-organizer/**": [
      "node_modules/tesseract.js/**",
      "node_modules/tesseract.js-core/**",
      "node_modules/wasm-feature-detect/**",
      "node_modules/regenerator-runtime/**",
      "node_modules/is-url/**",
      "node_modules/node-fetch/**",
      "node_modules/bmp-js/**",
      "node_modules/idb-keyval/**",
      "node_modules/zlibjs/**",
    ],
  },
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
    localPatterns: [
      { pathname: "/api/exhibitions/**" },
      { pathname: "/api/tours/**" },
      { pathname: "/api/team-members/**" },
      { pathname: "/api/magazine/**" },
    ],
  },
  experimental: {
    // Defaults to os.cpus().length - 1, which on shared hosting reports the
    // host's full core count (60+) rather than what the account can actually
    // spawn — the build then hits the account's process-spawn limit (EAGAIN,
    // or a build worker aborting outright) while collecting page data. The
    // host itself has ample memory (500GB+) -- this is a per-account
    // process/fork quota, not real resource pressure, and cpus: 2 alone
    // stopped being enough once other processes on the account (a
    // crash-looping app instance, leftover build workers from previous
    // aborted attempts) were also competing for it. Single-worker page-data
    // collection is slower but survives that.
    cpus: 1,
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
              // Video hub/related-video embeds -- admin-pasted URLs are
              // restricted to these same hosts server-side (see
              // isValidVideoEmbedUrl in validate-upload.ts) before they're
              // ever rendered as an <iframe src>.
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
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
