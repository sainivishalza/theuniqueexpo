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
    localPatterns: [{ pathname: "/api/exhibitions/**" }],
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
        // Admin pages are auth-gated, client-rendered dashboards -- they must
        // never be served from a long-lived edge/CDN cache, or a redeploy's
        // changes (styling, features) can appear "stuck" on stale content.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        // Per-exhibition registration is auth-gated and per-user (prefilled
        // from the visitor's own past submissions) -- must never be cached.
        source: "/exhibitions/:slug/register",
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
    ];
  },
};

module.exports = nextConfig;
