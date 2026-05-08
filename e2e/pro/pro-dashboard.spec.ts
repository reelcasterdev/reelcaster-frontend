import { test, expect } from '@playwright/test';
import { loginAs, freeUser, proUser, setUserTier, resetUserState } from '../fixtures/users';

/**
 * Phase 5 — Pro Dashboard polish: V2 forecast map mounts, "Pro" badge present,
 * bathymetry layer toggle exposed via the existing depth control.
 */

test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  await setUserTier(proUser.email, 'pro_annual');
  await resetUserState(proUser.email);
});

test('Pro user lands on V2 dashboard with map + Pro badge', async ({ page }) => {
  await loginAs(page, proUser);
  await page.goto('/dashboard');

  await expect(page.getByTestId('pro-dashboard-root')).toBeVisible();
  await expect(page.getByTestId('forecast-map')).toBeVisible();
  // Pro badge is desktop-only (hidden lg:block) — we set a desktop viewport.
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.reload();
  await expect(page.getByTestId('pro-badge')).toBeVisible({ timeout: 10_000 });
});

test('Free user does NOT see Pro Dashboard', async ({ page }) => {
  await setUserTier(freeUser.email, 'free');
  await resetUserState(freeUser.email);
  await loginAs(page, freeUser);
  await page.goto('/dashboard');

  await expect(page.getByTestId('free-dashboard-root')).toBeVisible();
  await expect(page.getByTestId('pro-dashboard-root')).toHaveCount(0);
  await expect(page.getByTestId('forecast-map')).toHaveCount(0);
  await expect(page.getByTestId('pro-badge')).toHaveCount(0);
});

test('/14-day-report → 404 (Phase 5 cleanup)', async ({ page }) => {
  const response = await page.goto('/14-day-report', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);
});
