import { test, expect } from '@playwright/test';
import { assertHasMetaDescription, assertHasTitle } from '../helpers/seo';

/**
 * Phase 8 — section presence on city pages at `/fishing/<province>/<city>`.
 *
 * Two real cities are tested:
 *   - Victoria (data-rich): asserts CitySpots renders with ≥1 published spot.
 *   - Vancouver (sparse):   asserts CitySpots is hidden (no published spots there yet).
 *
 * Sections currently stubbed in BC (`conditions_now`, `species_table`, etc.)
 * are explicitly asserted-absent. When the data lands, those `toHaveCount(0)`
 * assertions flip to `toBeVisible()` — that's the signal the backfill worked.
 */

const ALWAYS_VISIBLE_CITY_SECTIONS = [
  'section-city-hero',
  'section-city-about',
  'section-city-techniques',
  'section-city-score-cta',
  'section-city-seasonal-guide',
  'section-city-local-intel',
  'section-city-faq',
] as const;

const CONDITIONAL_CITY_SECTIONS_STUBBED_TODAY = [
  'section-city-conditions-strip', // BC stub: conditions_now=null
  'section-city-species-table', // BC: species_table=[]
  'section-city-access-points', // BC: city_access_points empty
  'section-city-local-experts', // BC: city_charters empty
] as const;

test.describe('/fishing/bc/victoria-bc — data-rich city page', () => {
  test.beforeEach(async ({ page }) => {
    const r = await page.goto('/fishing/bc/victoria-bc');
    if (r?.status() === 404) {
      test.skip(true, 'victoria-bc city_page is not published');
    }
  });

  for (const testid of ALWAYS_VISIBLE_CITY_SECTIONS) {
    test(`${testid} is visible`, async ({ page }) => {
      await expect(page.getByTestId(testid)).toBeVisible();
    });
  }

  test('section-city-spots is visible with at least one spot link', async ({ page }) => {
    const spots = page.getByTestId('section-city-spots');
    await expect(spots).toBeVisible();
    const link = spots.locator('a[href^="/fishing/bc/victoria-bc/"]').first();
    await expect(link).toBeVisible();
  });

  for (const testid of CONDITIONAL_CITY_SECTIONS_STUBBED_TODAY) {
    test(`${testid} is intentionally absent until data lands`, async ({ page }) => {
      await expect(page.getByTestId(testid)).toHaveCount(0);
    });
  }

  test('section-city-regulation-alerts — visible with cards or skipped', async ({ page }) => {
    const strip = page.getByTestId('section-city-regulation-alerts');
    if (!(await strip.isVisible().catch(() => false))) {
      test.skip(true, 'no high-signal DFO notices for victoria-bc regulatory areas');
      return;
    }
    await expect(strip).toBeVisible();
    await expect(page.getByTestId('regulation-alert-card').first()).toBeVisible();
  });

  test('section-city-catch-reports — visible with cards or skipped', async ({ page }) => {
    const section = page.getByTestId('section-city-catch-reports');
    if (!(await section.isVisible().catch(() => false))) {
      test.skip(true, 'no active fishing_reports for Victoria, Sidney');
      return;
    }
    await expect(section).toBeVisible();
    await expect(page.getByTestId('report-highlight-card').first()).toBeVisible();
  });

  test('SEO basics: title + meta description', async ({ page }) => {
    await assertHasTitle(page);
    await assertHasMetaDescription(page);
  });
});

test.describe('/fishing/bc/vancouver-bc — sparse city page (no published spots)', () => {
  test.beforeEach(async ({ page }) => {
    const r = await page.goto('/fishing/bc/vancouver-bc');
    if (r?.status() === 404) {
      test.skip(true, 'vancouver-bc city_page is not published');
    }
  });

  for (const testid of ALWAYS_VISIBLE_CITY_SECTIONS) {
    test(`${testid} is visible`, async ({ page }) => {
      await expect(page.getByTestId(testid)).toBeVisible();
    });
  }

  test('section-city-spots is hidden because vancouver-bc has 0 published spots', async ({ page }) => {
    await expect(page.getByTestId('section-city-spots')).toHaveCount(0);
  });
});
