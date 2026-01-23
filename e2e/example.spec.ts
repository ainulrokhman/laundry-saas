import { test, expect } from '@playwright/test';

/**
 * Example E2E Test
 * 
 * This is a placeholder test file.
 * Replace with your actual E2E tests.
 */

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  
  // Add your assertions here
  await expect(page).toHaveTitle(/Laundry SaaS/);
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Example: Click a link and verify navigation
  // await page.click('text=Dashboard');
  // await expect(page).toHaveURL('/dashboard');
});
