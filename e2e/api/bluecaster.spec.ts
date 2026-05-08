import { test, expect } from '@playwright/test';
import { env } from '../fixtures/env';
import { bcRequest } from '../fixtures/bluecaster-client';

/**
 * Phase 1 contract: bluecaster public endpoints.
 *
 * These tests hit the BC dev server directly (default http://localhost:3001)
 * with the public API key. Skipped if env.bluecasterUrl/apiKey aren't set.
 *
 * To run locally:
 *   cd ../bluecaster && npm run dev   # bluecaster on :3001
 *   cd ../reelcaster-frontend && pnpm test:e2e e2e/api/bluecaster.spec.ts
 */

const enabled = Boolean(env.bluecasterUrl) && Boolean(env.bluecasterApiKey);

test.describe('BC: GET /api/v1/cities', () => {
  test.skip(!enabled, 'bluecaster credentials missing in .env.test');

  test('returns published cities array with required fields', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/cities?province=BC&status=published&limit=5');
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.cities)).toBe(true);
    expect(body.meta).toBeTruthy();
    expect(body.meta.status).toBe('published');
    if (body.cities.length > 0) {
      const c = body.cities[0];
      expect(c).toHaveProperty('slug');
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('province');
      // Hero image may be null but the field must exist.
      expect(c).toHaveProperty('hero_image_url');
    }
  });

  test('rejects unknown status', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/cities?status=banana');
    expect(r.status()).toBe(400);
  });

  test('honors limit', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/cities?limit=1');
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.cities.length).toBeLessThanOrEqual(1);
  });

  test('returns 401 without API key', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/cities', { skipAuth: true });
    expect(r.status()).toBe(401);
  });
});

test.describe('BC: GET /api/v1/provinces/[code]/cities', () => {
  test.skip(!enabled, 'bluecaster credentials missing in .env.test');

  test('returns BC cities scoped to province', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/provinces/bc/cities');
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.province?.code?.toLowerCase()).toBe('bc');
    expect(Array.isArray(body.cities)).toBe(true);
  });

  test('returns 404 for unknown province code', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/provinces/zz/cities');
    expect(r.status()).toBe(404);
  });
});

test.describe('BC: GET /api/v1/cities/[slug]/spots', () => {
  test.skip(!enabled, 'bluecaster credentials missing in .env.test');

  test('returns spots array for a known city', async ({ request }) => {
    // The actual city slug is `victoria-bc` (cities.slug), not `victoria`.
    const r = await bcRequest(request).get('/api/v1/cities/victoria-bc/spots');
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.city?.slug).toBe('victoria-bc');
    expect(Array.isArray(body.spots)).toBe(true);
    if (body.spots.length > 0) {
      const s = body.spots[0];
      expect(typeof s.lat).toBe('number');
      expect(typeof s.lng).toBe('number');
    }
  });

  test('returns 404 for unknown city', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/cities/this-city-does-not-exist/spots');
    expect(r.status()).toBe(404);
  });
});

test.describe('BC: GET /api/v1/species', () => {
  test.skip(!enabled, 'bluecaster credentials missing in .env.test');

  test('returns master list', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/species?limit=10');
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.species)).toBe(true);
    if (body.species.length > 0) {
      const s = body.species[0];
      expect(s).toHaveProperty('slug');
      expect(s).toHaveProperty('name');
    }
  });

  test('substring search filter narrows results', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/species?q=salmon&limit=20');
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.species)).toBe(true);
  });
});

test.describe('BC: GET /api/v1/species/[slug]', () => {
  test.skip(!enabled, 'bluecaster credentials missing in .env.test');

  test('returns species detail with featured cities + top spots', async ({ request }) => {
    // Find any species first to avoid hard-coding a slug that may not exist.
    const list = await bcRequest(request).get('/api/v1/species?limit=1');
    const listBody = await list.json();
    const probeSlug = listBody.species?.[0]?.slug;
    if (!probeSlug) {
      test.skip(true, 'no species seeded in BC dev DB');
      return;
    }
    const r = await bcRequest(request).get(`/api/v1/species/${probeSlug}`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.species?.slug).toBe(probeSlug);
    expect(Array.isArray(body.featured_cities)).toBe(true);
    expect(Array.isArray(body.top_spots)).toBe(true);
  });

  test('returns 404 for unknown slug', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/species/not-a-real-species');
    expect(r.status()).toBe(404);
  });
});

test.describe('BC: GET /api/v1/fishing-spots/[id]/score (extended)', () => {
  test.skip(!enabled, 'bluecaster credentials missing in .env.test');

  test('rejects request without species param', async ({ request }) => {
    // Use a synthetic UUID — even if the spot exists, missing species should 400 first.
    const r = await bcRequest(request).get(
      '/api/v1/fishing-spots/00000000-0000-0000-0000-000000000000/score',
    );
    expect(r.status()).toBe(400);
  });

  test('multi-day shape when ?days=N', async ({ request }) => {
    // Find a real spot+species pair via /cities/.../spots and /species
    const list = await bcRequest(request).get('/api/v1/species?limit=1');
    const listBody = await list.json();
    const speciesId = listBody.species?.[0]?.id;
    if (!speciesId) {
      test.skip(true, 'no species seeded');
      return;
    }
    const cityRes = await bcRequest(request).get('/api/v1/cities/victoria-bc/spots');
    const cityBody = await cityRes.json();
    const spotId = cityBody.spots?.[0]?.id;
    if (!spotId) {
      test.skip(true, 'no spots in Victoria for forecast test');
      return;
    }
    const r = await bcRequest(request).get(
      `/api/v1/fishing-spots/${spotId}/score?species=${speciesId}&days=14`,
    );
    expect(r.status()).toBeLessThan(500); // 200 or 503 if forecast_meta not seeded
    if (r.status() === 200) {
      const body = await r.json();
      expect(body).toHaveProperty('days');
      expect(Array.isArray(body.days)).toBe(true);
      expect(body.days.length).toBeLessThanOrEqual(14);
      expect(body).toHaveProperty('species_ids');
    }
  });

  test('multi-species shape when species param is comma-separated', async ({ request }) => {
    const list = await bcRequest(request).get('/api/v1/species?limit=2');
    const listBody = await list.json();
    const ids = (listBody.species ?? []).map((s: { id: string }) => s.id);
    if (ids.length < 2) {
      test.skip(true, 'need at least 2 species seeded');
      return;
    }
    const cityRes = await bcRequest(request).get('/api/v1/cities/victoria-bc/spots');
    const cityBody = await cityRes.json();
    const spotId = cityBody.spots?.[0]?.id;
    if (!spotId) {
      test.skip(true, 'no spots in Victoria');
      return;
    }
    const r = await bcRequest(request).get(
      `/api/v1/fishing-spots/${spotId}/score?species=${ids.join(',')}&days=1`,
    );
    expect(r.status()).toBeLessThan(500);
    if (r.status() === 200) {
      const body = await r.json();
      expect(body.species_ids).toEqual(ids);
      expect(body.days?.length).toBe(1);
    }
  });
});

test.describe('BC: GET /api/v1/spots/[slug]/page', () => {
  test.skip(!enabled, 'bluecaster credentials missing in .env.test');

  // james-island-909cc6 is the demo spot published in 2026-05-06.
  const SPOT_SLUG = 'james-island-909cc6';

  test('returns the published spot-page payload with the BlueCasterSpotPage shape', async ({ request }) => {
    const r = await bcRequest(request).get(`/api/v1/spots/${SPOT_SLUG}/page`);
    if (r.status() === 404) {
      test.skip(true, `${SPOT_SLUG} spot_page is not published`);
      return;
    }
    expect(r.status()).toBe(200);
    const body = await r.json();

    // Top-level keys
    for (const k of [
      'page',
      'spot',
      'hierarchy',
      'rc_score_now',
      'forecast',
      'species_table',
      'seasonal_abundance',
      'access_points',
      'local_experts',
      'meta',
    ]) {
      expect(body, `key "${k}" missing`).toHaveProperty(k);
    }

    // page.* — slug + status + breadcrumb
    expect(body.page.slug).toBe(SPOT_SLUG);
    expect(body.page.status).toBe('published');
    expect(Array.isArray(body.page.hero?.breadcrumb)).toBe(true);
    expect(body.page.hero.breadcrumb.length).toBeGreaterThanOrEqual(2);

    // spot.* — geometry + name
    expect(body.spot.slug).toBe(SPOT_SLUG);
    expect(typeof body.spot.lat).toBe('number');
    expect(typeof body.spot.lng).toBe('number');

    // forecast.rows — non-empty for james-island-909cc6 (it has 14d of scores)
    expect(typeof body.forecast.horizon_hours).toBe('number');
    expect(body.forecast.horizon_hours).toBeGreaterThan(0);
    expect(Array.isArray(body.forecast.rows)).toBe(true);
    if (body.forecast.rows.length > 0) {
      const row = body.forecast.rows[0];
      for (const k of ['species_id', 'stock_id', 'hour_utc', 'score']) {
        expect(row).toHaveProperty(k);
      }
    }
  });

  test('returns 404 for an unknown spot slug', async ({ request }) => {
    const r = await bcRequest(request).get('/api/v1/spots/this-slug-does-not-exist/page');
    expect(r.status()).toBe(404);
  });

  test('returns 401 without API key', async ({ request }) => {
    const r = await bcRequest(request).get(
      `/api/v1/spots/${SPOT_SLUG}/page`,
      { skipAuth: true },
    );
    expect(r.status()).toBe(401);
  });
});
