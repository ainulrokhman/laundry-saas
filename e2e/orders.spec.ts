import { test, expect } from '@playwright/test';

/**
 * E2E: Orders / POS
 * Untuk tes buat order penuh: login dulu (gunakan TEST_OWNER_PHONE/PIN), lalu buka POS/orders.
 */

test.describe('Orders', () => {
  test('orders page requires auth', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL(/\/(login|auth|signin)/);
  });
});
