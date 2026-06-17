// Registry of the bathymetry PMTiles archives behind the per-tile proxy at
// /api/map/tiles/[set]/[z]/[x]/[y]. Shared by the relief style builder (client
// + server) and the proxy route, so it must stay free of server-only imports.
//
// Ported from bluecaster's lib/bluecaster/map/tile-sets.ts. The archives live
// on bluecaster's public Supabase Storage `bathymetry` bucket (no secrets); we
// self-host the per-tile proxy so reelcaster serves them same-origin off its
// own edge cache.
//
// The set id embeds the bake version: tile URLs are cached immutable, so a
// re-bake on the bluecaster side MUST be mirrored here — bump the version const,
// rename the matching key (keys are literal on purpose — they appear verbatim in
// style JSON and URLs), and update the references in relief-style.ts.

export const CDN = "https://szbrwccppikqkystlgmq.supabase.co/storage/v1/object/public/bathymetry";

export const RELIEF_VERSION = "2026-06";
export const LAND_VERSION = "2026-05";

export interface TileSetDef {
  /** Absolute .pmtiles URL on the CDN. */
  url: string;
  /** Content-Type served per tile: image/webp | application/x-protobuf. */
  contentType: string;
  /** Re-gzip decompressed MVT bytes for the wire (raster WebP is already dense). */
  gzip: boolean;
  /** Archive header zoom range — requests outside it short-circuit to 204. */
  minzoom: number;
  maxzoom: number;
}

export const TILE_SETS: Record<string, TileSetDef> = {
  // WebP q80 transcode of the relief bake (~250 MB, small enough for the CDN
  // edge cache). Produced by bluecaster scripts/bathymetry/transcode_relief_webp.py.
  "relief-webp-2026-06": {
    url: `${CDN}/relief-hybrid-webp.${RELIEF_VERSION}.pmtiles`,
    contentType: "image/webp",
    gzip: false,
    minzoom: 8,
    maxzoom: 14,
  },
  // Contours pruned to z14 (the style's display cap).
  "contours-z14-2026-06": {
    url: `${CDN}/relief-contours-z14.${RELIEF_VERSION}.pmtiles`,
    contentType: "application/x-protobuf",
    gzip: true,
    minzoom: 9,
    maxzoom: 14,
  },
  "land-2026-05": {
    url: `${CDN}/bathymetry-land.${LAND_VERSION}.pmtiles`,
    contentType: "application/x-protobuf",
    gzip: true,
    minzoom: 4,
    maxzoom: 14,
  },
};

export function tileUrlTemplate(origin: string, setId: string): string {
  return `${origin}/api/map/tiles/${setId}/{z}/{x}/{y}`;
}
