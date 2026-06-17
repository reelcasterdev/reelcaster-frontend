import { NextRequest, NextResponse } from "next/server";
import { fetchSpotForecast14d } from "@/lib/bluecaster";

/**
 * GET /api/bluecaster/spots/[slug]/forecast-14d
 *
 * Same-origin proxy to BlueCaster's `/api/v1/spots/[slug]/forecast-14d`.
 * Lets the browser-side `LiveSpotPage` lazy-fetch the 14-day extended
 * grid without exposing the BlueCaster API key to the client. Matches
 * the rest of this app's BC integration: server-only key, single env
 * var (BLUECASTER_API_KEY).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const data = await fetchSpotForecast14d(slug);
    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
