import { test, expect } from '@playwright/test';

/**
 * Smoke E2E: homepage and basic navigation
 */

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Laundry SaaS|Kasirlondri/i);
});

test('login link or button visible on homepage', async ({ page }) => {
  await page.goto('/');
  const loginLink = page.getByRole('link', { name: /masuk|login/i }).or(
    page.getByRole('button', { name: /masuk|login/i })
  );
  await expect(loginLink.first()).toBeVisible({ timeout: 5000 });
});
