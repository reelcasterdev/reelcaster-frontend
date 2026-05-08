import { test, expect } from '@playwright/test';
import { assertHasMetaDescription, assertHasTitle } from '../helpers/seo';

/**
 * Phase 8 — section presence on the spot page `/fishing/<province>/<city>/<spot>`.
 *
 * Tested against the real published James Island spot in Victoria. Signed-out
 * preview only; auth-gated branches (free + pro) are out of scope until
 * .env.test fixtures land.
 */

const SPOT_URL = '/fishing/bc/victoria-bc/james-island-909cc6';

test.describe(`${SPOT_URL} (signed-out preview)`, () => {
  test.beforeEach(async ({ page }) => {
    const r = await page.goto(SPOT_URL);
    if (r?.status() === 404) {
      test.skip(true, 'james-island-909cc6 spot_page is not published');
    }
  });

  test('section-spot-hero is visible', async ({ page }) => {
    await expect(page.getByTestId('section-spot-hero')).toBeVisible();
  });

  test('section-spot-score-cta is visible', async ({ page }) => {
    await expect(page.getByTestId('section-spot-score-cta')).toBeVisible();
  });

  test('section-spot-forecast-strip is visible (clipped to 6h preview for signed-out)', async ({ page }) => {
    await expect(page.getByTestId('section-spot-forecast-strip')).toBeVisible();
  });

  test('section-spot-paywall-teaser is visible', async ({ page }) => {
    await expect(page.getByTestId('section-spot-paywall-teaser')).toBeVisible();
  });

  test('signed-out-spot-banner sticky CTA is visible', async ({ page }) => {
    await expect(page.getByTestId('signed-out-spot-banner')).toBeVisible();
  });

  test('section-spot-breakdown-panel is hidden (authed-only)', async ({ page }) => {
    await expect(page.getByTestId('section-spot-breakdown-panel')).toHaveCount(0);
  });

  test('section-spot-regulation-alerts — visible with cards or skipped', async ({ page }) => {
    const strip = page.getByTestId('section-spot-regulation-alerts');
    if (!(await strip.isVisible().catch(() => false))) {
      test.skip(true, 'no DFO notices for james-island spot dfo_area_label');
      return;
    }
    await expect(strip).toBeVisible();
    await expect(page.getByTestId('regulation-alert-card').first()).toBeVisible();
  });

  test('section-spot-nearby-spots — visible with cards or skipped', async ({ page }) => {
    const section = page.getByTestId('section-spot-nearby-spots');
    if (!(await section.isVisible().catch(() => false))) {
      test.skip(true, 'no resolvable nearby spots within 50km of james-island');
      return;
    }
    await expect(section).toBeVisible();
    const card = page.getByTestId('nearby-spot-card').first();
    await expect(card).toBeVisible();
    const href = await card.getAttribute('href');
    expect(href).toMatch(/^\/fishing\/[a-z]{2}\/[a-z0-9-]+\/[a-z0-9-]+$/);
  });

  test('SEO basics: title + meta description', async ({ page }) => {
    await assertHasTitle(page);
    await assertHasMetaDescription(page);
  });
});
