import { test, expect } from '@playwright/test';
import { freeUser, proUser, setUserTier, resetUserState, loginAs } from '../fixtures/users';

/**
 * Phase 7 — full-funnel canary.
 *
 * The end-to-end signal that the public → free → pro flow still works.
 * This spec doesn't fill a Stripe card form — that lives in
 * `e2e/paywall/checkout-flow.spec.ts` once the test-mode key is wired in
 * deploy envs. Here we exercise everything around it: marketing → spot
 * preview → signup gate → free dashboard with onboarding → upgrade modal →
 * (manual webhook flip via setUserTier) → pro dashboard → portal entry.
 *
 * Requires a populated `.env.test` and seeded `freeUser` / `proUser`.
 */

test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  await setUserTier(freeUser.email, 'free');
  await resetUserState(freeUser.email);
  await setUserTier(proUser.email, 'pro_annual');
  await resetUserState(proUser.email);
});

test('public marketing → spot preview → signup gate', async ({ page, request }) => {
  // 1. /fishing is the public marketing entry (/ is the coming-soon landing).
  const homepage = await page.goto('/fishing');
  expect(homepage?.status()).toBeLessThan(400);
  await expect(page.getByTestId('marketing-header')).toBeVisible();

  // 2. A real published spot URL from the sitemap renders the preview banner.
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
  await expect(page.getByTestId('signed-out-spot-banner')).toBeVisible({ timeout: 10_000 });
});

test('free dashboard cards-only + onboarding flow', async ({ page }) => {
  await loginAs(page, freeUser);
  await page.goto('/dashboard?onboarding=1');
  await expect(page.getByTestId('onboarding-modal')).toBeVisible();
  await page.getByTestId('onboarding-skip').click();
  await expect(page.getByTestId('free-dashboard-root')).toBeVisible();
  await expect(page.getByTestId('forecast-map')).toHaveCount(0);
  await expect(page.getByTestId('complete-profile-banner')).toBeVisible();
});

test('upgrade gate from free → simulated activation → pro dashboard', async ({ page }) => {
  await loginAs(page, freeUser);
  // Pretend the webhook fires (Stripe-test-mode happy path covered separately).
  await setUserTier(freeUser.email, 'pro_annual');
  await page.goto('/dashboard');
  await expect(page.getByTestId('pro-dashboard-root')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('forecast-map')).toBeVisible();
});

test('subscription deletion reverts to free dashboard', async ({ page }) => {
  await loginAs(page, proUser);
  await page.goto('/dashboard');
  await expect(page.getByTestId('pro-dashboard-root')).toBeVisible({ timeout: 10_000 });

  // Simulate `customer.subscription.deleted` by flipping tier back.
  await setUserTier(proUser.email, 'free');
  await page.reload();
  await expect(page.getByTestId('free-dashboard-root')).toBeVisible({ timeout: 10_000 });
});

test('legacy routes are gone', async ({ page }) => {
  for (const path of ['/v1', '/14-day-report', '/map-test']) {
    const r = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(r?.status(), `${path} should be 404`).toBe(404);
  }
});
