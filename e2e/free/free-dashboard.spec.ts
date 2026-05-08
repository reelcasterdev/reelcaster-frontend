import { test, expect } from '@playwright/test';
import { loginAs, freeUser, setUserTier, resetUserState } from '../fixtures/users';

/**
 * Phase 3 — Free Dashboard, onboarding modal, and forecast horizon enforcement.
 *
 * These specs presume a seeded `freeUser` exists in the test Supabase project.
 * Each spec resets the user's alerts/favorites/onboarding state so the
 * "first-run" flow can be exercised end-to-end.
 */

test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  await setUserTier(freeUser.email, 'free');
  await resetUserState(freeUser.email);
});

test.describe('Free dashboard layout', () => {
  test('cards-only — no V2 forecast map present', async ({ page }) => {
    await loginAs(page, freeUser);
    await page.goto('/dashboard');

    await expect(page.getByTestId('free-dashboard-root')).toBeVisible();
    await expect(page.getByTestId('home-spot-card')).toBeVisible();
    await expect(page.getByTestId('forecast-map')).toHaveCount(0);
    await expect(page.getByTestId('pro-dashboard-root')).toHaveCount(0);
  });

  test('shows persistent "Complete profile" banner before onboarding', async ({ page }) => {
    await loginAs(page, freeUser);
    await page.goto('/dashboard');
    await expect(page.getByTestId('complete-profile-banner')).toBeVisible();
  });
});

test.describe('Onboarding modal flow', () => {
  test('?onboarding=1 opens the modal', async ({ page }) => {
    await loginAs(page, freeUser);
    await page.goto('/dashboard?onboarding=1');
    await expect(page.getByTestId('onboarding-modal')).toBeVisible();
    await expect(page.getByTestId('onboarding-step-1')).toBeVisible();
  });

  test('skip closes the modal and leaves the banner visible', async ({ page }) => {
    await loginAs(page, freeUser);
    await page.goto('/dashboard?onboarding=1');
    await page.getByTestId('onboarding-skip').click();
    await expect(page.getByTestId('onboarding-modal')).toHaveCount(0);
    await expect(page.getByTestId('complete-profile-banner')).toBeVisible();
  });

  test('finish saves state and removes the banner', async ({ page }) => {
    await loginAs(page, freeUser);
    await page.goto('/dashboard?onboarding=1');
    // Step 1 → Step 2
    await page.getByTestId('onboarding-next').click();
    await expect(page.getByTestId('onboarding-step-2')).toBeVisible();
    // Step 2 → Step 3
    await page.getByTestId('onboarding-next').click();
    await expect(page.getByTestId('onboarding-step-3')).toBeVisible();
    // Finish
    await page.getByTestId('onboarding-finish').click();
    await page.waitForURL((url) => !url.search.includes('onboarding=1'), { timeout: 10_000 });
    await expect(page.getByTestId('onboarding-modal')).toHaveCount(0);
    await expect(page.getByTestId('complete-profile-banner')).toHaveCount(0);
  });
});

test.describe('Spot page forecast horizon (free)', () => {
  test('locked-days teaser visible after auth on a published spot', async ({ page, request }) => {
    await loginAs(page, freeUser);
    // Probe sitemap for a real spot URL so we don't hard-code a slug.
    const sitemap = await request.get('/sitemap.xml');
    const xml = await sitemap.text();
    const spotMatch = xml.match(
      /<loc>https?:\/\/[^/]+(\/fishing\/[a-z]{2}\/[a-z0-9-]+\/[a-z0-9-]+)<\/loc>/,
    );
    if (!spotMatch) {
      test.skip(true, 'no spot URLs in sitemap');
      return;
    }
    await page.goto(spotMatch[1]);
    await expect(page.getByTestId('forecast-locked-teaser')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('upgrade-cta')).toBeVisible();
  });
});

test.describe('Legacy routes removed', () => {
  test('/v1 returns 404', async ({ page }) => {
    const response = await page.goto('/v1', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
  });
});
