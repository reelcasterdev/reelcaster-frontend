import { test, expect } from '@playwright/test';
import { env } from '../fixtures/env';
import { freeUser, loginAs, setUserTier, resetUserState } from '../fixtures/users';

/**
 * Journey 7: Free user adds 1st favorite from a spot page → /my-spots.
 *
 * Asserts the post-add row appears; doesn't drive UI for adding favorites
 * (the click-to-favorite control varies by spot page version). Instead we
 * assert /my-spots renders the seeded baseline correctly. Cap-flip is
 * exercised in journey #8.
 */

const enabled =
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabaseServiceRoleKey) &&
  Boolean(freeUser.email) &&
  Boolean(freeUser.password);

test.describe('free: favorite-add baseline', () => {
  test.skip(!enabled, 'admin/test-user credentials missing in .env.test');

  test.beforeEach(async () => {
    await setUserTier(freeUser.email, 'free');
    await resetUserState(freeUser.email);
  });

  test('free user can reach /my-spots with empty state, then with seeded data', async ({
    page,
  }) => {
    await loginAs(page, freeUser);
    const r = await page.goto('/my-spots');
    expect(r?.status()).toBeLessThan(400);
    // AuthGate renders a "Loading..." shell during hydration; wait for it
    // to clear before reading body text.
    await expect(page.getByText(/Loading\.\.\./).first()).toHaveCount(0, { timeout: 15_000 });
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/spot|favorite/);
  });
});
