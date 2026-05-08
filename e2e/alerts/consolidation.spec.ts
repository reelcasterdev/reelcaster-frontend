import { test, expect } from '@playwright/test';
import { loginAs, freeUser, setUserTier, resetUserState } from '../fixtures/users';

/**
 * Phase 6 — alerts/notifications consolidation.
 *
 * - `/alerts` is the canonical landing for real-time triggers.
 * - `/profile/forecast-emails` is the new home for scheduled digests.
 * - `/profile/notification-settings` permanent-redirects to the new path.
 * - The forecast-emails page surfaces a callout pointing back to /alerts so
 *   users don't confuse the two systems.
 */

test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  await setUserTier(freeUser.email, 'free');
  await resetUserState(freeUser.email);
});

test('/profile/notification-settings → 308 to /profile/forecast-emails', async ({ page }) => {
  await loginAs(page, freeUser);
  await page.goto('/profile/notification-settings');
  await page.waitForURL((url) => url.pathname === '/profile/forecast-emails', {
    timeout: 10_000,
  });
});

test('forecast-emails page renders cross-link to /alerts', async ({ page }) => {
  await loginAs(page, freeUser);
  await page.goto('/profile/forecast-emails');
  const callout = page.getByTestId('forecast-emails-alerts-callout');
  await expect(callout).toBeVisible();
  await expect(callout).toContainText(/real-time alerts/i);
  await expect(callout.locator('a[href="/alerts"]')).toBeVisible();
});

test('/alerts is the canonical alerts landing', async ({ page }) => {
  await loginAs(page, freeUser);
  const r = await page.goto('/alerts');
  expect(r?.status()).toBeLessThan(400);
});
