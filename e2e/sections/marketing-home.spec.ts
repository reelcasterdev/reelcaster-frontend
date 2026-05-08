import { test, expect } from '@playwright/test';
import {
  assertHasMetaDescription,
  assertHasTitle,
} from '../helpers/seo';

/**
 * Phase 8 — section presence on the public homepage at `/`.
 *
 * Asserts each major section wrapper renders, plus chrome and SEO basics.
 * Conditional sections (FeaturedCities, SpeciesPreview) skip gracefully when
 * the BC test instance has no published cities/species.
 */

test.describe('/ (marketing homepage)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('marketing chrome renders', async ({ page }) => {
    await expect(page.getByTestId('marketing-header')).toBeVisible();
    await expect(page.getByTestId('marketing-footer')).toBeVisible();
  });

  test('hero section + headline + primary CTA render', async ({ page }) => {
    await expect(page.getByTestId('homepage-hero')).toBeVisible();
    await expect(page.getByTestId('marketing-hero-headline')).toBeVisible();
    const cta = page.getByTestId('marketing-primary-cta');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', /\/signup/);
  });

  test('how-it-works section renders', async ({ page }) => {
    await expect(page.getByTestId('homepage-how-it-works')).toBeVisible();
  });

  test('featured cities section renders with at least one city card', async ({ page }) => {
    // Wait for AuthGate to flip from its Loading splash before asserting on
    // public-page testids (the SSR shell ships the testids inside an RSC
    // payload that only attaches to the DOM after hydration).
    await expect(page.getByTestId('marketing-header')).toBeVisible();
    await expect(page.getByTestId('homepage-featured-cities')).toBeVisible();
    await expect(page.getByTestId('city-carousel')).toBeVisible();
    await expect(page.getByTestId('city-card').first()).toBeVisible();
  });

  test('species preview section renders with at least one species card', async ({ page }) => {
    await expect(page.getByTestId('marketing-header')).toBeVisible();
    await expect(page.getByTestId('homepage-species-preview')).toBeVisible();
    await expect(page.getByTestId('species-card').first()).toBeVisible();
  });

  test('regulation alerts strip — section + cards (skips when no high-signal notices)', async ({
    page,
  }) => {
    await expect(page.getByTestId('marketing-header')).toBeVisible();
    const strip = page.getByTestId('homepage-regulation-alerts');
    if (!(await strip.isVisible().catch(() => false))) {
      test.skip(true, 'no critical/high or closure/opening DFO notices in test instance');
      return;
    }
    await expect(strip).toBeVisible();
    await expect(strip.getByRole('heading', { level: 2 })).toContainText(/water/i);
    await expect(page.getByTestId('regulation-alert-card').first()).toBeVisible();
    // "All notices" link points at /regulations
    const allNotices = strip.getByRole('link', { name: /All notices/ }).first();
    await expect(allNotices).toHaveAttribute('href', '/regulations');
  });

  test('featured spots section — section + cards (skips when no published spots)', async ({
    page,
  }) => {
    await expect(page.getByTestId('marketing-header')).toBeVisible();
    const section = page.getByTestId('homepage-featured-spots');
    if (!(await section.isVisible().catch(() => false))) {
      test.skip(true, 'no published spots in test instance hierarchy');
      return;
    }
    await expect(section).toBeVisible();
    const card = page.getByTestId('spot-card').first();
    await expect(card).toBeVisible();
    // Card href shape: /fishing/<province>/<city>/<spot>
    const href = await card.getAttribute('href');
    expect(href).toMatch(/^\/fishing\/[a-z]{2}\/[a-z0-9-]+\/[a-z0-9-]+$/);
  });

  test('final CTA section renders', async ({ page }) => {
    await expect(page.getByTestId('homepage-final-cta')).toBeVisible();
  });

  test('SEO basics: title + meta description', async ({ page }) => {
    // Note: the marketing homepage doesn't currently emit JSON-LD. If we add
    // a `WebSite` JSON-LD block later (see homepage SEO follow-up), assert it
    // here via assertHasJsonLd(page, 'WebSite').
    await assertHasTitle(page);
    await assertHasMetaDescription(page);
  });
});
