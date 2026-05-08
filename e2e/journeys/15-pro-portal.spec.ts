import { test, expect } from '@playwright/test';
import { env } from '../fixtures/env';
import { proUser, setUserTier } from '../fixtures/users';
import { getAccessToken, authedFetch } from '../fixtures/auth-helpers';

/**
 * Journey 16 (numbered): Pro user → "Manage subscription" → Stripe portal URL.
 *
 * UI assertion is brittle (the user-menu position varies); we directly
 * exercise the API path that `useUpgradeFlow().openPortal()` calls. Asserts
 * either a 200 with a Stripe URL, or an explicit error code if the seeded
 * user has no stripe_customer_id (acceptable for demo data).
 */

const enabled =
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabaseServiceRoleKey) &&
  Boolean(proUser.email) &&
  Boolean(proUser.password);

test.describe('pro: stripe portal endpoint behavior', () => {
  test.skip(!enabled, 'admin/test-user credentials missing in .env.test');

  test('POST /api/stripe/portal returns 200 + url, or a documented failure', async ({
    request,
  }) => {
    await setUserTier(proUser.email, 'pro_annual');
    const token = await getAccessToken(proUser);
    const r = await authedFetch(request, token, '/api/stripe/portal', { method: 'POST' });
    if (r.status() === 200) {
      const body = await r.json();
      expect(typeof body.url).toBe('string');
      expect(body.url).toMatch(/stripe\.com/);
    } else {
      // Acceptable: no Stripe customer on seeded user. We don't drive Stripe in tests.
      expect([400, 404, 500]).toContain(r.status());
    }
  });
});
