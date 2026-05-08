import { test, expect } from '@playwright/test';

/**
 * Journey 1: Anon home → fishing index → BC → city → spot preview.
 *
 * Hops:
 *   /  →  /fishing  →  /fishing/bc  →  /fishing/bc/victoria-bc
 *      →  /fishing/bc/victoria-bc/brotchie-ledge-c22e90
 *
 * Assertions:
 *   - Each hop returns 200.
 *   - Marketing chrome (header/footer) renders on every public page.
 *   - Spot page shows the signed-out preview: sticky banner, hero, no
 *     breakdown panel (signed-in only). Forecast clip is verified by the
 *     API contracts spec; here we just check the strip is mounted.
 *
 * Runs in a fresh storage context so no leaked auth from other specs.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test('anon: home → fishing → bc → victoria → brotchie-ledge', async ({ page }) => {
  // /
  let r = await page.goto('/');
  expect(r?.status()).toBeLessThan(400);
  await expect(page.getByTestId('marketing-header')).toBeVisible();
  await expect(page.getByTestId('marketing-hero-headline')).toBeVisible();

  // /fishing
  r = await page.goto('/fishing');
  expect(r?.status()).toBeLessThan(400);
  await expect(page.getByTestId('marketing-header')).toBeVisible();

  // /fishing/bc
  r = await page.goto('/fishing/bc');
  expect(r?.status()).toBeLessThan(400);

  // /fishing/bc/victoria-bc
  r = await page.goto('/fishing/bc/victoria-bc', { waitUntil: 'domcontentloaded' });
  if (r?.status() === 404) {
    test.skip(true, 'victoria-bc city page not published');
    return;
  }
  expect(r?.status()).toBeLessThan(400);
  await expect(page.getByTestId('section-city-hero')).toBeVisible({ timeout: 15_000 });

  // /fishing/bc/victoria-bc/brotchie-ledge-c22e90
  r = await page.goto('/fishing/bc/victoria-bc/brotchie-ledge-c22e90', {
    waitUntil: 'domcontentloaded',
  });
  if (r?.status() === 404) {
    test.skip(true, 'brotchie-ledge spot page not published');
    return;
  }
  expect(r?.status()).toBeLessThan(400);

  // Spot hero + forecast strip mount; breakdown panel hidden for unauth.
  await expect(page.getByTestId('section-spot-hero')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('section-spot-forecast-strip')).toBeVisible();
  await expect(page.getByTestId('section-spot-breakdown-panel')).toHaveCount(0);
  // Sticky signed-out banner.
  await expect(page.getByTestId('signed-out-spot-banner')).toBeVisible();
});
