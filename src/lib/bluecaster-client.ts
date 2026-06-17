// Browser-side lazy fetcher for the live-spot 14-day extended grid.
//
// Runs in `LiveSpotPage` (client component) — triggered on first user
// interaction (scroll / pointer / key / touch) or after `requestIdleCallback`
// (~800 ms). By the time the user clicks a future-day tile in the picker,
// the payload is already in memory.
//
// Goes through a same-origin proxy at /api/bluecaster/spots/[slug]/forecast-14d
// so the BlueCaster API key stays server-only (matches every other BC call
// in this codebase). No `NEXT_PUBLIC_BLUECASTER_*` env var needed.

import type { Forecast14dPayload } from "./bluecaster/live-spot-types";

export async function fetchForecast14d(
  spotSlug: string
): Promise<Forecast14dPayload> {
  const res = await fetch(
    `/api/bluecaster/spots/${encodeURIComponent(spotSlug)}/forecast-14d`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `forecast-14d API returned ${res.status} for ${spotSlug}: ${body}`
    );
  }
  return (await res.json()) as Forecast14dPayload;
}
