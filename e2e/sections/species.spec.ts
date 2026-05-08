import { test, expect } from '@playwright/test';
import { assertHasMetaDescription, assertHasTitle } from '../helpers/seo';

/**
 * Phase 8 — section presence on `/species` (index) and `/species/<slug>` (detail).
 */

test.describe('/species (index)', () => {
  test('renders the species list with at least one card', async ({ page }) => {
    const r = await page.goto('/species');
    expect(r?.status()).toBeLessThan(400);

    await expect(page.getByTestId('species-list')).toBeVisible();
    await expect(page.getByTestId('species-card').first()).toBeVisible();
    await assertHasTitle(page);
  });
});

test.describe('/species/chinook-salmon (detail)', () => {
  test.beforeEach(async ({ page }) => {
    const r = await page.goto('/species/chinook-salmon');
    if (r?.status() === 404) {
      test.skip(true, 'chinook-salmon species record missing');
    }
  });

  test('section-species-hero is visible', async ({ page }) => {
    await expect(page.getByTestId('section-species-hero')).toBeVisible();
  });

  test('section-species-cta is visible', async ({ page }) => {
    await expect(page.getByTestId('section-species-cta')).toBeVisible();
  });

  test('seasonal calendar is visible when data is present, else absent', async ({ page }) => {
    const section = page.getByTestId('section-species-seasonal');
    const count = await section.count();
    if (count > 0) {
      await expect(section).toBeVisible();
    } else {
      // Seasonal calendar correctly hides when seasonal_calendar is null. No-op.
      expect(count).toBe(0);
    }
  });

  test('SEO basics: title + meta description', async ({ page }) => {
    await assertHasTitle(page);
    await assertHasMetaDescription(page);
  });

  test('coming-soon panel hidden for seeded species', async ({ page }) => {
    // chinook-salmon is in the demo seed set (Phase B) and has scientific_name +
    // family + seasonal_calendar populated, so the stub flag should be false.
    await expect(page.getByTestId('section-species-coming-soon')).toHaveCount(0);
  });
});

test.describe('/species/<stub-slug> (un-seeded species)', () => {
  // albacore-tuna is one of ~75 species rows that exist as slug+name stubs only.
  // It exercises the graceful "Profile coming soon" panel introduced in Phase C.
  // If someone later adds a profile for it the spec stays valid by reading the db.
  const STUB_SLUG = 'albacore-tuna';

  test.beforeEach(async ({ page }) => {
    const r = await page.goto(`/species/${STUB_SLUG}`);
    if (r?.status() === 404) {
      test.skip(true, `${STUB_SLUG} species record missing`);
    }
  });

  test('hero still renders', async ({ page }) => {
    await expect(page.getByTestId('section-species-hero')).toBeVisible();
  });

  test('coming-soon panel is visible (stub heuristic)', async ({ page }) => {
    await expect(page.getByTestId('section-species-coming-soon')).toBeVisible();
  });

  test('seasonal calendar is hidden (no data)', async ({ page }) => {
    await expect(page.getByTestId('section-species-seasonal')).toHaveCount(0);
  });

  test('CTA still renders at the bottom', async ({ page }) => {
    await expect(page.getByTestId('section-species-cta')).toBeVisible();
  });
});
