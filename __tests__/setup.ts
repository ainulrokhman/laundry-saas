/**
 * Vitest Setup File
 * 
 * This file runs before all tests to configure the testing environment.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
beforeAll(() => {
  // Mock Next.js useRouter
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  }));

  // Mock Next.js headers
  vi.mock('next/headers', () => ({
    headers: vi.fn(() => ({
      get: vi.fn(),
    })),
    cookies: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
    })),
  }));
});

// Suppress console errors in tests (optional - remove if you want to see errors)
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
// };
