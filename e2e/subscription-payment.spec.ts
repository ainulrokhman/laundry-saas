import { test, expect } from '@playwright/test';

/**
 * E2E: Subscription / payment upload
 * Upload bukti bayar memerlukan login OWNER.
 */

test.describe('Subscription payment', () => {
  test('subscription page requires auth', async ({ page }) => {
    await page.goto('/dashboard/subscription');
    await expect(page).toHaveURL(/\/(login|auth|signin)/);
  });
});
