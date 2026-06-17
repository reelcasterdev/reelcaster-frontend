import { test, expect } from '@playwright/test';
import { env } from '../fixtures/env';
import { proUser, loginAs, setUserTier, resetUserState } from '../fixtures/users';
import { getAccessToken, authedFetch } from '../fixtures/auth-helpers';

/**
 * Journey 15 (numbered): Pro user 11th alert hits the 10-cap.
 */

const enabled =
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabaseServiceRoleKey) &&
  Boolean(proUser.email) &&
  Boolean(proUser.password);

test.describe('pro: 11th alert hits 10-cap', () => {
  test.skip(!enabled, 'admin/test-user credentials missing in .env.test');

  test.beforeEach(async () => {
    await resetUserState(proUser.email);
    await setUserTier(proUser.email, 'pro_annual');
  });

  test('11th POST returns 400', async ({ request, page }) => {
    await loginAs(page, proUser);
    const token = await getAccessToken(proUser);
    const baseBody = {
      location_lat: 48.4284,
      location_lng: -123.3656,
      location_name: 'Victoria',
      triggers: { fishing_score: { enabled: true, min_score: 60 } },
      logic_mode: 'AND' as const,
      cooldown_hours: 24,
      delivery_channels: ['email'],
      active: true,
    };
    for (let i = 0; i < 10; i++) {
      const r = await authedFetch(request, token, '/api/alerts', {
        method: 'POST',
        body: { ...baseBody, name: `Pro alert ${i + 1}` },
      });
      expect.soft(r.status(), `seed i=${i}`).toBeLessThan(400);
    }
    const eleventh = await authedFetch(request, token, '/api/alerts', {
      method: 'POST',
      body: { ...baseBody, name: 'Pro alert 11' },
    });
    expect(eleventh.status()).toBe(400);
  });
});
