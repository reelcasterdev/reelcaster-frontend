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
  async headers() {
    // Long-cache the static map assets the Explore relief style fetches (glyph
    // fonts + the place-label GeoJSON). The relief/contour/land tiles set their
    // own immutable cache in the /api/map/tiles proxy.
    const ASSET_CACHE = [
      { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
    ];
    return [
      { source: "/fonts/:path*", headers: ASSET_CACHE },
      { source: "/:file.geojson", headers: ASSET_CACHE },
    ];
  },
};

export default nextConfig;
