import { test, expect } from '@playwright/test';

/**
 * E2E: Public tracking
 * Buka /outlet/[slug]/track/[code] - untuk slug/code valid butuhkan data seed.
 */

test.describe('Public track', () => {
  test('track page loads for given slug and code', async ({ page }) => {
    const res = await page.goto('/outlet/no-such-outlet-xyz/track/INVALID01');
    expect(res?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/outlet\/no-such-outlet-xyz\/track\/INVALID01/);
  });

  test('track page URL structure is correct', async ({ page }) => {
    await page.goto('/outlet/test-outlet/track/ABC12345');
    await expect(page).toHaveURL(/\/outlet\/test-outlet\/track\/ABC12345/);
  });
});
