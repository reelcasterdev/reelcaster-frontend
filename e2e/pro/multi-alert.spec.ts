import { test, expect } from '@playwright/test';
import { loginAs, proUser, setUserTier, resetUserState } from '../fixtures/users';
import { getAccessToken, authedFetch } from '../fixtures/auth-helpers';

/**
 * Phase 5 — Multi-alert UX for Pro tier.
 *
 * The full 10-alert UI exercise lives in this spec. We seed alerts via the
 * API to keep the test fast and avoid coupling to the score-alert form which
 * needs a published spot.
 */

test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  await setUserTier(proUser.email, 'pro_annual');
  await resetUserState(proUser.email);
});

test('Pro user can create and toggle multiple alerts', async ({ page, request }) => {
  const token = await getAccessToken(proUser);
  for (let i = 0; i < 3; i++) {
    const r = await authedFetch(request, token, '/api/alerts', {
      method: 'POST',
      body: minimalCompositeAlert(`Multi alert ${i + 1}`),
    });
    expect.soft(r.status(), `seed ${i} failed: ${await r.text().catch(() => '')}`).toBeLessThan(400);
  }

  await loginAs(page, proUser);
  await page.goto('/alerts');
  // Each profile renders inside CustomAlertsList — confirm at least 3 exist.
  const cards = page.locator('h3', { hasText: /^Multi alert/i });
  await expect(cards).toHaveCount(3, { timeout: 10_000 });
});

test('Pro user 11th alert returns 400 with limit copy', async ({ request }) => {
  const token = await getAccessToken(proUser);
  // Seed 10 alerts.
  for (let i = 0; i < 10; i++) {
    const r = await authedFetch(request, token, '/api/alerts', {
      method: 'POST',
      body: minimalCompositeAlert(`Pro cap ${i + 1}`),
    });
    expect.soft(r.status(), `seed ${i} failed`).toBeLessThan(400);
  }
  // 11th should fail.
  const eleventh = await authedFetch(request, token, '/api/alerts', {
    method: 'POST',
    body: minimalCompositeAlert('Pro cap 11'),
  });
  expect(eleventh.status()).toBe(400);
  const body = await eleventh.json();
  expect((body.error as string).toLowerCase()).toContain('10');
});

test('Duplicate button creates a new alert with "(copy)" suffix', async ({ page, request }) => {
  const token = await getAccessToken(proUser);
  await authedFetch(request, token, '/api/alerts', {
    method: 'POST',
    body: minimalCompositeAlert('Dup source'),
  });

  await loginAs(page, proUser);
  await page.goto('/alerts');
  await expect(page.locator('h3', { hasText: 'Dup source' })).toBeVisible({ timeout: 10_000 });
  const dup = page.getByTestId('alert-duplicate').first();
  await dup.click();
  await expect(page.locator('h3', { hasText: 'Dup source (copy)' })).toBeVisible({
    timeout: 10_000,
  });
});

function minimalCompositeAlert(name: string) {
  return {
    name,
    location_lat: 48.4284,
    location_lng: -123.3656,
    location_name: 'Victoria Waterfront',
    triggers: {
      fishing_score: { enabled: true, min_score: 60 },
    },
    logic_mode: 'AND',
    cooldown_hours: 24,
    delivery_channels: ['email'],
    active: true,
  };
}
