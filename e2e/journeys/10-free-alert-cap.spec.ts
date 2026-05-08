import { test, expect } from '@playwright/test';
import { env } from '../fixtures/env';
import { freeUser, loginAs, setUserTier, resetUserState } from '../fixtures/users';
import { getAccessToken, authedFetch } from '../fixtures/auth-helpers';

/**
 * Journey 10: Free user 2nd alert hits paywall.
 *
 * Drives the API directly to lock the contract; UI paywall modal is
 * exercised in the dedicated paywall spec.
 */

const enabled =
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabaseServiceRoleKey) &&
  Boolean(freeUser.email) &&
  Boolean(freeUser.password);

test.describe('free: 2nd alert hits cap', () => {
  test.skip(!enabled, 'admin/test-user credentials missing in .env.test');

  test.beforeEach(async () => {
    await setUserTier(freeUser.email, 'free');
    await resetUserState(freeUser.email);
  });

  test('2nd POST returns 400 + upgrade_required:true', async ({ request, page }) => {
    await loginAs(page, freeUser);
    const token = await getAccessToken(freeUser);
    const body1 = {
      name: 'Free alert 1',
      location_lat: 48.4284,
      location_lng: -123.3656,
      location_name: 'Victoria',
      triggers: { fishing_score: { enabled: true, min_score: 60 } },
      logic_mode: 'AND',
      cooldown_hours: 24,
      delivery_channels: ['email'],
      active: true,
    };
    const first = await authedFetch(request, token, '/api/alerts', {
      method: 'POST',
      body: body1,
    });
    expect(first.status()).toBeLessThan(400);

    const second = await authedFetch(request, token, '/api/alerts', {
      method: 'POST',
      body: { ...body1, name: 'Free alert 2' },
    });
    expect(second.status()).toBe(400);
    const json = await second.json();
    expect(json.upgrade_required).toBe(true);
  });
});
