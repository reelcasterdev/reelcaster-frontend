import { test, expect } from '@playwright/test';
import { env } from '../fixtures/env';
import { bcRequest } from '../fixtures/bluecaster-client';
import { freeUser, proUser, setUserTier, resetUserState } from '../fixtures/users';
import { getAccessToken, authedFetch } from '../fixtures/auth-helpers';

/**
 * Phase C.5 — API contract assertions that the user-journey suite depends on.
 *
 * This spec assumes the demo seeds have run:
 *   - bluecaster/scripts/seed-demo-content.ts (or the equivalent MCP writes)
 *   - reelcaster-frontend/scripts/seed-demo-users.ts
 *
 * Coverage layered on top of the existing contracts.spec.ts + bluecaster.spec.ts:
 *   - BC: city pages have hero + featured species post-seed.
 *   - BC: seeded species (chinook-salmon) returns non-empty top_spots.
 *   - BC: stub species (albacore-tuna) returns 200 with empty top_spots.
 *   - BC: cities/victoria-bc/spots returns ≥2 publishable spots.
 *   - FE: pro user 11th alert hits the 10-cap.
 *
 * Run locally:
 *   cd ../bluecaster && npm run dev          # :3001
 *   pnpm test:e2e e2e/api/journeys.spec.ts   # FE auto-starts on :3004
 */

const bcEnabled = Boolean(env.bluecasterUrl) && Boolean(env.bluecasterApiKey);
const adminEnabled =
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabaseServiceRoleKey) &&
  Boolean(freeUser.email) &&
  Boolean(freeUser.password) &&
  Boolean(proUser.email) &&
  Boolean(proUser.password);

// ─── BC content post-seed ────────────────────────────────────────────────

test.describe('BC post-seed: city_pages payload', () => {
  test.skip(!bcEnabled, 'bluecaster credentials missing in .env.test');

  test('victoria-bc has hero_image_url + featured_species_ids', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/cities/victoria-bc/page');
    if (r.status() === 404) {
      test.skip(true, 'victoria-bc city page not published');
      return;
    }
    expect(r.status()).toBe(200);
    const body = await r.json();
    // Hero image surfaces at page.hero.image_url; featured species surface
    // at page.hero.species_chips (the consumer-facing public name for the
    // featured_species_ids array, resolved to {slug,name} pairs).
    expect(body.page?.hero?.image_url, 'page.hero.image_url after Phase B').toBeTruthy();
    const chips: unknown = body.page?.hero?.species_chips;
    expect(Array.isArray(chips)).toBe(true);
    expect(
      (chips as unknown[]).length,
      'page.hero.species_chips non-empty after Phase B seed',
    ).toBeGreaterThanOrEqual(1);
  });
});

test.describe('BC post-seed: cities/victoria-bc/spots', () => {
  test.skip(!bcEnabled, 'bluecaster credentials missing in .env.test');

  test('returns ≥2 publishable spots (brotchie-ledge + james-island)', async ({
    request,
  }) => {
    const r = await bcRequest(request).get('/api/v1/cities/victoria-bc/spots');
    if (r.status() === 404) {
      test.skip(true, 'victoria-bc not in cities table or has no city_fishing_spots links');
      return;
    }
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.meta?.total ?? body.spots?.length ?? 0).toBeGreaterThanOrEqual(2);
    const slugs: string[] = (body.spots ?? []).map((s: { slug: string }) => s.slug);
    // Brotchie + James are the only spots with both a published spot_pages
    // entry AND is_published=true post Phase B seed.
    const expectAtLeastOne = slugs.some(
      (s) => s.startsWith('brotchie-ledge') || s.startsWith('james-island'),
    );
    expect(expectAtLeastOne, `none of the seeded spots in: ${slugs.join(', ')}`).toBe(true);
  });
});

test.describe('BC post-seed: species/chinook-salmon (seeded)', () => {
  test.skip(!bcEnabled, 'bluecaster credentials missing in .env.test');

  test('returns scientific_name + non-empty top_spots', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/species/chinook-salmon');
    if (r.status() === 404) {
      test.skip(true, 'chinook-salmon species missing');
      return;
    }
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.species?.scientific_name, 'seeded scientific_name').toBeTruthy();
    expect(body.species?.family).toBeTruthy();
    expect(body.species?.seasonal_calendar).toBeTruthy();
    expect(Array.isArray(body.top_spots)).toBe(true);
    expect(body.top_spots.length, 'top_spots non-empty after seed').toBeGreaterThanOrEqual(1);
  });
});

test.describe('BC: species/albacore-tuna (stub — graceful empty)', () => {
  test.skip(!bcEnabled, 'bluecaster credentials missing in .env.test');

  test('returns 200 with empty top_spots and null scientific_name', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/species/albacore-tuna');
    if (r.status() === 404) {
      test.skip(true, 'albacore-tuna species missing — pick another stub slug');
      return;
    }
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.species?.slug).toBe('albacore-tuna');
    expect(body.species?.scientific_name).toBeNull();
    expect(body.species?.seasonal_calendar).toBeNull();
    expect(Array.isArray(body.top_spots)).toBe(true);
    expect(body.top_spots.length).toBe(0);
  });
});

// ─── Frontend tier-cap (pro side) — fills a gap in contracts.spec.ts ────

test.describe('FE post-seed: pro user 11th alert hits 10-cap', () => {
  test.skip(!adminEnabled, 'admin/test-user credentials missing in .env.test');

  test.beforeEach(async () => {
    await resetUserState(proUser.email);
    await setUserTier(proUser.email, 'pro_annual');
  });

  test('11th alert returns 400', async ({ request }) => {
    const token = await getAccessToken(proUser);
    // Seed 10
    for (let i = 0; i < 10; i++) {
      const r = await authedFetch(request, token, '/api/alerts', {
        method: 'POST',
        body: minimalAlertBody(`Pro cap alert ${i + 1}`),
      });
      expect.soft(r.status(), `seed i=${i}`).toBeLessThan(400);
    }
    const eleventh = await authedFetch(request, token, '/api/alerts', {
      method: 'POST',
      body: minimalAlertBody('Pro cap alert 11'),
    });
    expect(eleventh.status()).toBe(400);
  });
});

// ─── Frontend stripe portal pro-only sanity ──────────────────────────────

test.describe('FE post-seed: stripe portal returns URL for pro user', () => {
  test.skip(!adminEnabled, 'admin/test-user credentials missing in .env.test');

  test('POST /api/stripe/portal returns 200 + url for pro user', async ({ request }) => {
    await setUserTier(proUser.email, 'pro_annual');
    const token = await getAccessToken(proUser);
    const r = await authedFetch(request, token, '/api/stripe/portal', {
      method: 'POST',
    });
    // 200 with {url} when stripe_customer_id exists; 400/500 with a clear error
    // when the seeded user has no stripe customer (we don't drive the real
    // checkout flow in tests). Either is acceptable here — what we're locking
    // is "auth required" + "shape" in contracts.spec.ts; this just exercises
    // the pro path end-to-end as a smoke.
    if (r.status() === 200) {
      const body = await r.json();
      expect(typeof body.url).toBe('string');
      expect(body.url).toMatch(/billing\.stripe\.com|stripe\.com/);
    } else {
      // Acceptable failure mode: no stripe customer on the seeded user.
      expect([400, 404, 500]).toContain(r.status());
    }
  });
});

// ─── helpers ─────────────────────────────────────────────────────────────

function minimalAlertBody(name: string) {
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
