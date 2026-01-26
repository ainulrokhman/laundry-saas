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

import '@testing-library/jest-dom/vitest';
import { PrismaClient } from '../src/generated/prisma';
import { getTestDatabaseUrl, isDatabaseAvailable } from './utils/test-db';

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
  // IMPORTANT SAFETY:
  // - Jika TEST_DATABASE_URL tidak diset, jangan pernah fallback ke DATABASE_URL.
  // - Kembalikan stub yang akan melempar error saat dipakai.
  if (!isDatabaseAvailable()) {
    const stub = new Proxy(
      {},
      {
        get() {
          throw new Error(
            'Database tests tidak aktif. Untuk mengaktifkan:\n' +
              '- Set TEST_DATABASE_URL di .env.local (database test terpisah)\n' +
              '- Jalankan `npm run prisma:push:test` untuk sync schema (jika diperlukan)'
          );
        },
      }
    ) as unknown as PrismaClient;

    return { prisma: stub, default: stub };
  }

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
