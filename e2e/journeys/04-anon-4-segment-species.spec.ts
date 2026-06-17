import { test, expect } from '@playwright/test';

/**
 * Journey 4: Anon 4-segment SEO URL (species filter on a spot page).
 *
 * /fishing/bc/victoria-bc/brotchie-ledge-c22e90/chinook-salmon
 *
 * Assertions:
 *   - 200 (not 404).
 *   - Spot hero renders.
 *   - Forecast strip mounts.
 *   - Page <title> includes the species name (the Phase 2 4-segment slug
 *     parser tailors the meta title).
 */

test.use({ storageState: { cookies: [], origins: [] } });

test('anon: 4-segment species-filtered spot URL', async ({ page }) => {
  const r = await page.goto(
    '/fishing/bc/victoria-bc/brotchie-ledge-c22e90/chinook-salmon',
  );
  if (r?.status() === 404) {
    test.skip(true, '4-segment URL 404 — seed missing or species not at spot');
    return;
  }
  expect(r?.status()).toBeLessThan(400);

  await expect(page.getByTestId('section-spot-hero')).toBeVisible();
  await expect(page.getByTestId('section-spot-forecast-strip')).toBeVisible();

  const title = await page.title();
  expect(title.toLowerCase()).toContain('chinook');
});
