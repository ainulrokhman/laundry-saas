import { test, expect } from '@playwright/test';

/**
 * E2E: Auth - login page and flow
 * Untuk tes login sukses, set env TEST_OWNER_PHONE dan TEST_OWNER_PIN (opsional).
 */

test.describe('Auth', () => {
  test('login page loads and has phone + PIN inputs', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Laundry|Login|Masuk/i);
    await expect(page.getByRole('textbox', { name: /nomor|phone|telepon/i })).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('login with wrong PIN shows error', async ({ page }) => {
    await page.goto('/login');
    const phoneInput = page.getByRole('textbox', { name: /nomor|phone|telepon/i });
    const pinInput = page.locator('input[type="password"]').first();
    await phoneInput.fill('6281234567890');
    await pinInput.fill('0000');
    await page.getByRole('button', { name: /masuk|login|submit/i }).click();
    await expect(page.getByText(/salah|gagal|invalid|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('redirect to login when accessing dashboard unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/(login|auth|signin)/);
  });
});
