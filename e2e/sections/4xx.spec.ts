import { test, expect } from '@playwright/test';

/**
 * Phase 8 — confirm legacy / unknown routes are gone.
 *
 * Two flavors:
 *   - Deleted route directories (`/v1`, `/14-day-report`, `/map-test`) should
 *     return a hard HTTP 404.
 *   - Unknown dynamic-catch-all paths (`/fishing/bc/<unknown>`) currently
 *     stream a 200 with the not-found UI, because Next.js can't change the
 *     status code mid-stream once a deeper async server component throws
 *     `notFound()`. We assert the rendered body contains the not-found
 *     content rather than the response status.
 */

const HARD_404 = ['/v1', '/14-day-report', '/map-test'];

for (const path of HARD_404) {
  test(`${path} returns hard 404`, async ({ page }) => {
    const r = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(r?.status(), `${path} should be 404`).toBe(404);
  });
}

test('/fishing/bc/<unknown> renders the not-found UI (status 200 — Next.js streaming quirk)', async ({ page }) => {
  await page.goto('/fishing/bc/this-city-does-not-exist', {
    waitUntil: 'domcontentloaded',
  });
  // App-router not-found page emits "404" or "page could not be found" copy.
  // Hydration is async, so wait for the body to surface either marker.
  await expect(page.locator('body')).toContainText(/404|could not be found/i, {
    timeout: 5000,
  });
});
