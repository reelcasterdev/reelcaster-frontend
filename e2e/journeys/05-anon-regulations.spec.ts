import { test, expect } from '@playwright/test';
import { assertHasJsonLd, assertHasMetaDescription, assertHasTitle } from '../helpers/seo';

/**
 * Journey 5: Anon regulations page.
 *
 * /regulations reads dfo_fishery_notices from the frontend Supabase project
 * (191 rows verified). JSON-LD GovernmentService present.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test('anon: /regulations renders with notice list + JSON-LD', async ({ page }) => {
  const r = await page.goto('/regulations');
  expect(r?.status()).toBeLessThan(400);

  await assertHasTitle(page);
  await assertHasMetaDescription(page);
  await assertHasJsonLd(page, 'GovernmentService');

  await expect(page.getByTestId('regulations-list')).toBeVisible();
});
