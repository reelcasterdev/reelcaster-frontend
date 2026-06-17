import { test, expect } from '@playwright/test';
import { assertHasTitle } from '../helpers/seo';

/**
 * Phase 8 — section presence on the province index `/fishing/bc`.
 */

test.describe('/fishing/bc (province index)', () => {
  test('renders with marketing chrome and at least one city link', async ({ page }) => {
    const r = await page.goto('/fishing/bc');
    expect(r?.status()).toBeLessThan(400);

    await expect(page.getByTestId('marketing-header')).toBeVisible();
    await expect(page.getByTestId('marketing-footer')).toBeVisible();

    // At least one city card linking into /fishing/bc/<slug>.
    const cityLink = page.locator('a[href^="/fishing/bc/"]').first();
    await expect(cityLink).toBeVisible();

    await assertHasTitle(page);
  });
});
