import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/bluecaster/currents/field?bbox=w,s,e,n&cols=&rows=&time=
 *
 * Same-origin proxy to BlueCaster's animated tidal-current grid
 * (`/api/map/currents/field` — auth-free, not under /api/v1). Keeps the Explore
 * currents overlay a same-origin fetch and shields the upstream origin. Short
 * cache since the field tracks the live tide.
 */
export async function GET(req: NextRequest) {
  const base = process.env.BLUECASTER_API_URL;
  if (!base) return new NextResponse("BLUECASTER_API_URL not set", { status: 500 });

  const src = new URL(req.url).searchParams;
  const qs = new URLSearchParams();
  for (const k of ["bbox", "cols", "rows", "time"]) {
    const v = src.get(k);
    if (v) qs.set(k, v);
  }

  const apiKey = process.env.BLUECASTER_API_KEY;
  try {
    const r = await fetch(`${base}/api/map/currents/field?${qs.toString()}`, {
      headers: apiKey ? { "x-api-key": apiKey } : undefined,
      cache: "no-store",
    });
    if (!r.ok) return new NextResponse("upstream error", { status: 502 });
    const body = await r.text();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=120",
      },
    });
  } catch {
    return new NextResponse("upstream unreachable", { status: 502 });
  }
}
