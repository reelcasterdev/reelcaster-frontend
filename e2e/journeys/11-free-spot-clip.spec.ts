import { test, expect } from '@playwright/test';
import { env } from '../fixtures/env';
import { freeUser, loginAs, setUserTier } from '../fixtures/users';

/**
 * Journey 11: Free user on a spot page → 1-day forecast clip + locked
 * teaser visible.
 *
 * The forecast horizon is enforced server-side (verified in
 * contracts.spec.ts). This spec asserts the *visual* tier-aware UI:
 * the locked-days teaser and upgrade CTA are rendered for free authed.
 */

const enabled =
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabaseServiceRoleKey) &&
  Boolean(freeUser.email) &&
  Boolean(freeUser.password);

test.describe('free: spot page tier-clipped UI', () => {
  test.skip(!enabled, 'admin/test-user credentials missing in .env.test');

  test.beforeEach(async () => {
    await setUserTier(freeUser.email, 'free');
  });

  test('locked-days teaser visible on spot page', async ({ page }) => {
    await loginAs(page, freeUser);
    const r = await page.goto('/fishing/bc/victoria-bc/brotchie-ledge-c22e90');
    if (r?.status() === 404) {
      test.skip(true, 'brotchie-ledge spot not published');
      return;
    }
    expect(r?.status()).toBeLessThan(400);

    await expect(page.getByTestId('horizon-aware-forecast')).toBeVisible();
    await expect(page.getByTestId('forecast-locked-teaser')).toBeVisible();
    await expect(page.getByTestId('upgrade-cta')).toBeVisible();
  });
});
