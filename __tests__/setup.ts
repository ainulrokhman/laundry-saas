/**
 * Vitest Setup File
 * 
 * This file runs before all tests to configure the testing environment.
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local with override to ensure test env vars are available
const result = config({ path: resolve(process.cwd(), '.env.local'), override: false });

// Debug: Log if TEST_DATABASE_URL is loaded (only in debug mode)
if (process.env.DEBUG) {
  console.log('Environment variables loaded:', {
    hasTestDb: !!process.env.TEST_DATABASE_URL,
    hasDb: !!process.env.DATABASE_URL,
    testDbLength: process.env.TEST_DATABASE_URL?.length,
  });
}

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { PrismaClient } from '../src/generated/prisma';
import { getTestDatabaseUrl } from './utils/test-db';

// Mock Next.js router (must be at top level, not inside beforeAll)
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

// Mock Next.js headers (must be at top level)
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

// Mock Prisma to use test database
// This ensures that code using prisma singleton (like account-lockout.ts)
// uses the same test database as the test itself
vi.mock('@/lib/prisma', async () => {
  const testDbUrl = getTestDatabaseUrl();
  const testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: testDbUrl,
      },
    },
    log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
  });

  return {
    prisma: testPrisma,
    default: testPrisma,
  };
});

// Suppress console errors in tests (optional - remove if you want to see errors)
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
// };
