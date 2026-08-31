/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
};

module.exports = nextConfig;
