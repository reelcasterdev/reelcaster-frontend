import { test, expect } from '@playwright/test';
import { env } from '../fixtures/env';
import { proUser, loginAs, setUserTier } from '../fixtures/users';

/**
 * Journey 14 (numbered): Pro user → spot page → 14-day forecast +
 * breakdown panel + (visually) bathymetry-toggleable.
 *
 * Bathymetry is a Pro Dashboard map control, not on the spot page; we
 * verify the spot-page side here (forecast strip + breakdown reveal).
 */

const enabled =
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabaseServiceRoleKey) &&
  Boolean(proUser.email) &&
  Boolean(proUser.password);

test.describe('pro: spot page full reveal', () => {
  test.skip(!enabled, 'admin/test-user credentials missing in .env.test');

  test.beforeEach(async () => {
    await setUserTier(proUser.email, 'pro_annual');
  });

  test('forecast strip + breakdown panel visible', async ({ page }) => {
    await loginAs(page, proUser);
    const r = await page.goto('/fishing/bc/victoria-bc/brotchie-ledge-c22e90');
    if (r?.status() === 404) {
      test.skip(true, 'brotchie-ledge spot not published');
      return;
    }
    expect(r?.status()).toBeLessThan(400);

    await expect(page.getByTestId('section-spot-forecast-strip')).toBeVisible();
    // Locked-days teaser must NOT render for pro.
    await expect(page.getByTestId('forecast-locked-teaser')).toHaveCount(0);
    // Breakdown panel revealed for signed-in users.
    await expect(page.getByTestId('section-spot-breakdown-panel')).toBeVisible();
  });
});
