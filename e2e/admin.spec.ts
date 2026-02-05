import { test, expect } from '@playwright/test';

/**
 * E2E: Admin panel
 * Akses /admin - unauthenticated redirect ke login.
 */

test.describe('Admin', () => {
  test('admin redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/(login|auth|signin)/);
  });

  test('admin outlets list requires auth', async ({ page }) => {
    await page.goto('/admin/outlets');
    await expect(page).toHaveURL(/\/(login|auth|signin)/);
  });
});
