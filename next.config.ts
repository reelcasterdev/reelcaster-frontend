import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  images: {
    remotePatterns: [
      // Unsplash hero images for city pages (seeded by
      // bluecaster/scripts/seed-demo-content.ts).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async redirects() {
    return [
      // Sidebar cleanup (2026-05-08): both pages duplicated public surfaces.
      { source: "/species-calendar", destination: "/species", permanent: true },
      { source: "/dfo-notices", destination: "/regulations", permanent: true },
    ];
  },
};

export default nextConfig;
