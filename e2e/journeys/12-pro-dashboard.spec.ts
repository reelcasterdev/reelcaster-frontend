import { test, expect } from '@playwright/test';
import { env } from '../fixtures/env';
import { proUser, loginAs, setUserTier } from '../fixtures/users';

/**
 * Journey 13 (numbered): Pro user → /dashboard → V2 forecast map renders.
 *
 * Locked decision: tier flip is a seeded precondition. We don't drive Stripe.
 */

const enabled =
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabaseServiceRoleKey) &&
  Boolean(proUser.email) &&
  Boolean(proUser.password);

test.describe('pro: dashboard renders V2 forecast map + pro badge', () => {
  test.skip(!enabled, 'admin/test-user credentials missing in .env.test');

  test.beforeEach(async () => {
    await setUserTier(proUser.email, 'pro_annual');
  });

  test('pro user sees ProDashboard', async ({ page, browserName }, testInfo) => {
    // Use a desktop viewport — pro-badge hides at <lg breakpoint.
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, proUser);
    const r = await page.goto('/dashboard');
    expect(r?.status()).toBeLessThan(400);

    await expect(page.getByTestId('pro-dashboard-root')).toBeVisible();
    await expect(page.getByTestId('forecast-map')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('pro-badge')).toBeVisible();
    // FreeDashboard testid must NOT be present.
    await expect(page.getByTestId('free-dashboard-root')).toHaveCount(0);
    void browserName;
    void testInfo;
  });
});
