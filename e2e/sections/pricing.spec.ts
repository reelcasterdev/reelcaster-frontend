import { test, expect } from '@playwright/test';
import { assertHasMetaDescription, assertHasTitle } from '../helpers/seo';

/**
 * Phase 8 — section presence on `/pricing`.
 *
 * Bare URL: feature callout is hidden.
 * `?feature=alerts`: feature callout is visible.
 */

test.describe('/pricing', () => {
  test('renders without the feature callout when no ?feature= query is set', async ({ page }) => {
    const r = await page.goto('/pricing');
    expect(r?.status()).toBeLessThan(400);

    await expect(page.getByTestId('pricing-feature-callout')).toHaveCount(0);
    await assertHasTitle(page);
    await assertHasMetaDescription(page);
  });

  test('renders the feature callout when ?feature=alerts is set', async ({ page }) => {
    await page.goto('/pricing?feature=alerts');
    await expect(page.getByTestId('pricing-feature-callout')).toBeVisible();
  });
});
