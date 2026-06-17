import { test, expect } from '@playwright/test';
import { loginAs, proUser, setUserTier, resetUserState } from '../fixtures/users';
import { getAccessToken, authedFetch } from '../fixtures/auth-helpers';

/**
 * Phase 5 — Favorites Pro upgrade.
 *
 * Pro users can save more than 5 spots and use the search filter to narrow
 * the saved list.
 */

test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  await setUserTier(proUser.email, 'pro_annual');
  await resetUserState(proUser.email);
});

test('Pro user can save more than the free 5-spot cap', async ({ request }) => {
  const token = await getAccessToken(proUser);
  for (let i = 0; i < 7; i++) {
    const r = await authedFetch(request, token, '/api/favorite-spots', {
      method: 'POST',
      body: {
        name: `Pro spot ${i + 1}`,
        lat: 48.4 + i * 0.01,
        lon: -123.36,
        notes: '',
      },
    });
    expect.soft(r.status(), `add ${i} failed: ${await r.text().catch(() => '')}`).toBeLessThan(400);
  }
});

test('Search filter narrows the saved list', async ({ page, request }) => {
  const token = await getAccessToken(proUser);
  for (const name of ['Oak Bay', 'Sidney', 'Sooke']) {
    await authedFetch(request, token, '/api/favorite-spots', {
      method: 'POST',
      body: {
        name,
        lat: 48.4 + Math.random() * 0.1,
        lon: -123.36 - Math.random() * 0.1,
        notes: '',
      },
    });
  }

  await loginAs(page, proUser);
  await page.goto('/my-spots');
  // Wait for the list to render.
  await expect(page.locator('h3', { hasText: /Oak Bay|Sidney|Sooke/ })).toHaveCount(3, {
    timeout: 10_000,
  });

  const search = page.getByTestId('favorites-search');
  await expect(search).toBeVisible();
  await search.fill('Oak');
  await expect(page.locator('h3', { hasText: 'Oak Bay' })).toBeVisible();
  await expect(page.locator('h3', { hasText: 'Sidney' })).toHaveCount(0);
  await expect(page.locator('h3', { hasText: 'Sooke' })).toHaveCount(0);
});
