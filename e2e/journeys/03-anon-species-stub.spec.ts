import { test, expect } from '@playwright/test';

/**
 * Journey 3: Anon species detail (un-seeded, stub) graceful state.
 *
 * /species/albacore-tuna is one of the 75 stub species rows that exist as
 * slug+name only. The Phase C empty-state UI should render the
 * "Profile coming soon" panel rather than a thin/broken layout.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test('anon: stub species shows coming-soon panel + signup CTA', async ({ page }) => {
  const r = await page.goto('/species/albacore-tuna');
  if (r?.status() === 404) {
    test.skip(true, 'albacore-tuna species missing — pick another stub slug');
    return;
  }
  expect(r?.status()).toBeLessThan(400);

  await expect(page.getByTestId('section-species-hero')).toBeVisible();
  await expect(page.getByTestId('section-species-coming-soon')).toBeVisible();
  // Seasonal calendar must NOT render for stubs.
  await expect(page.getByTestId('section-species-seasonal')).toHaveCount(0);
  // Bottom CTA still renders.
  await expect(page.getByTestId('section-species-cta')).toBeVisible();
});
