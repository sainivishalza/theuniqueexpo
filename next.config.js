/** @type {import('next').NextConfig} */
const nextConfig = {
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
