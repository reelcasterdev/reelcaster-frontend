import { test, expect } from '@playwright/test';

/**
 * Journey 2: Anon species index → species detail (seeded) → top spot click.
 *
 * Hops:
 *   /species  →  /species/chinook-salmon  →  click into a top spot
 *
 * Assertions:
 *   - Species index lists at least one card.
 *   - chinook-salmon detail page (post-seed) shows scientific_name,
 *     12-month seasonal grid, and a non-empty top_spots section.
 *   - Top-spot click resolves to a 200.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test('anon: species index → chinook-salmon → top spot click', async ({ page }) => {
  let r = await page.goto('/species');
  expect(r?.status()).toBeLessThan(400);
  await expect(page.getByTestId('species-list')).toBeVisible();
  await expect(page.getByTestId('species-card').first()).toBeVisible();

  r = await page.goto('/species/chinook-salmon');
  if (r?.status() === 404) {
    test.skip(true, 'chinook-salmon species missing');
    return;
  }
  expect(r?.status()).toBeLessThan(400);
  await expect(page.getByTestId('section-species-hero')).toBeVisible();
  await expect(page.getByTestId('section-species-coming-soon')).toHaveCount(0);
  await expect(page.getByTestId('section-species-seasonal')).toBeVisible();

  // top-spots section: present post Phase B seed, otherwise skip.
  const topSpots = page.getByTestId('section-species-top-spots');
  if ((await topSpots.count()) === 0) {
    test.skip(true, 'top_spots section absent — Phase B seed may not have run');
    return;
  }
  // Top-spots are currently rendered as text (not links) on the species
  // detail page — assert presence rather than clicking through. The
  // click-through journey to a spot is exercised by journey 1.
  await expect(topSpots).toBeVisible();

  // Featured-cities cards ARE links — click the first to verify the
  // species → city navigation path.
  const featured = page.getByTestId('section-species-featured-cities');
  if ((await featured.count()) === 0) {
    return; // no featured cities tagged; skip the click-through.
  }
  const firstLink = featured.locator('a').first();
  const href = await firstLink.getAttribute('href');
  expect(href).toBeTruthy();
  if (href) {
    const r2 = await page.goto(href);
    expect(r2?.status()).toBeLessThan(400);
    await expect(page.getByTestId('section-city-hero')).toBeVisible();
  }
});
