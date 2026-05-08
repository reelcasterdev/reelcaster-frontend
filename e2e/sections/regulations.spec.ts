import { test, expect } from '@playwright/test';
import {
  assertHasJsonLd,
  assertHasMetaDescription,
  assertHasTitle,
} from '../helpers/seo';

/**
 * Phase 8 — section presence on `/regulations`.
 */

test.describe('/regulations', () => {
  test('renders the DFO notice list with at least one entry', async ({ page }) => {
    const r = await page.goto('/regulations');
    expect(r?.status()).toBeLessThan(400);

    const list = page.getByTestId('regulations-list');
    await expect(list).toBeVisible();
  });

  test('SEO basics: title, meta description, GovernmentService JSON-LD', async ({ page }) => {
    await page.goto('/regulations');
    await assertHasTitle(page);
    await assertHasMetaDescription(page);
    await assertHasJsonLd(page, 'GovernmentService');
  });
});
