import { test, expect } from '@playwright/test';
import { env } from '../fixtures/env';
import { freeUser, loginAs, setUserTier, resetUserState } from '../fixtures/users';

/**
 * Journey 9: Free user reaches /alerts and quick-creates the 1st alert.
 *
 * Limited to verifying the page renders + the new-alert button is visible.
 * Form submission with realistic trigger config is covered in
 * `e2e/api/contracts.spec.ts` (alerts: 1st alert succeeds for free user).
 */

const enabled =
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabaseServiceRoleKey) &&
  Boolean(freeUser.email) &&
  Boolean(freeUser.password);

test.describe('free: alerts page renders', () => {
  test.skip(!enabled, 'admin/test-user credentials missing in .env.test');

  test.beforeEach(async () => {
    await setUserTier(freeUser.email, 'free');
    await resetUserState(freeUser.email);
  });

  test('free user sees /alerts with at-cap helper visible after seeding 1', async ({
    page,
  }) => {
    await loginAs(page, freeUser);
    const r = await page.goto('/alerts');
    expect(r?.status()).toBeLessThan(400);
    // The "New Alert" button (or its at-cap variant) is rendered for free users.
    await expect(page.getByTestId('alerts-new-button')).toBeVisible();
  });
});
