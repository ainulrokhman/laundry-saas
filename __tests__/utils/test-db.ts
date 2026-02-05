/**
 * Test Database Utilities
 * 
 * Utilities for managing test database connections and operations.
 * Uses a separate test database to avoid affecting development data.
 */

import { PrismaClient } from '../../src/generated/prisma';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cache to track if we've loaded env vars
let envLoaded = false;

/**
 * Ensure .env.local is loaded
 */
function ensureEnvLoaded(): void {
  if (!envLoaded) {
    const result = config({ path: resolve(process.cwd(), '.env.local'), override: false });
    envLoaded = true;
  }
}

/**
 * Get test database connection
 * Uses TEST_DATABASE_URL only (never fall back to DATABASE_URL)
 */
export function getTestDatabaseUrl(): string {
  // Always ensure env vars are loaded
  ensureEnvLoaded();
  
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) {
    throw new Error(
      'TEST_DATABASE_URL wajib diset untuk menjalankan database tests.\n' +
      'Demi keamanan, suite test tidak akan pernah memakai DATABASE_URL.\n' +
      'Silakan set TEST_DATABASE_URL di .env.local (gunakan database test terpisah).'
    );
  }

  return testDbUrl;
}

/**
 * Check if database is available for testing
 */
export function isDatabaseAvailable(): boolean {
  // Ensure env vars are loaded
  ensureEnvLoaded();
  // Policy: DB tests auto-run jika TEST_DATABASE_URL tersedia.
  // (Repo ini tidak akan pernah fallback ke DATABASE_URL demi keamanan.)
  return !!process.env.TEST_DATABASE_URL;
}

/**
 * Create a test Prisma client instance
 * 
 * Use this in tests to ensure isolation from the main database connection.
 */
export function createTestPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: getTestDatabaseUrl(),
      },
    },
    log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
  });
}

/**
 * Clean up test data
 * 
 * Truncates all tables in the correct order (respecting foreign key constraints).
 * Deletes child records first, then parent records.
 * Use this in beforeEach or afterEach to ensure clean test state.
 * 
 * ⚠️ SAFETY: Only cleans up if TEST_DATABASE_URL is set to protect main database.
 */
export async function cleanupTestDatabase(prisma: PrismaClient): Promise<void> {
  // Ensure .env.local is loaded
  ensureEnvLoaded();
  
  // Safety check: Only allow cleanup if TEST_DATABASE_URL is explicitly set
  // This prevents accidentally deleting data from the main development/production database
  if (!process.env.TEST_DATABASE_URL) {
    const currentUrl = process.env.DATABASE_URL || 'unknown';
    console.warn(
      '⚠️  WARNING: TEST_DATABASE_URL is not set. Cleanup skipped to protect main database.\n' +
      `   Current database: ${currentUrl.replace(/:[^:@]+@/, ':****@')}\n` +
      '   To enable test cleanup, set TEST_DATABASE_URL in .env.local\n' +
      '   Tests will still run, but cleanup will be skipped.'
    );
    return;
  }

  // Delete in order to respect foreign key constraints
  // Start with most dependent tables (children) and work up to parent tables
  
  // Transactions reference Orders, BankAccounts, PaymentGatewayConfigs
  await prisma.transaction.deleteMany();
  
  // OrderStatusHistory references Orders and Users
  await prisma.orderStatusHistory.deleteMany();
  
  // OrderItems reference Orders and Services
  await prisma.orderItem.deleteMany();
  
  // Orders reference Outlets and optionally Customer
  await prisma.order.deleteMany();
  
  // Customers reference Outlets
  await prisma.customer.deleteMany();
  
  // Services reference Outlets
  await prisma.service.deleteMany();
  
  // BankAccounts reference Outlets
  await prisma.bankAccount.deleteMany();
  
  // PaymentGatewayConfigs reference Outlets
  await prisma.paymentGatewayConfig.deleteMany();
  
  // OTP codes are independent (no foreign keys to other tables)
  await prisma.otpCode.deleteMany();
  
  // Expenses reference Outlets
  await prisma.expense.deleteMany();
  
  // Users reference Outlets (outletId is nullable, but we delete users first to be safe)
  await prisma.user.deleteMany();
  
  // Outlets are parent tables (no dependencies on other tables)
  await prisma.outlet.deleteMany();
  
  // SubscriptionPackage is platform data (optional cleanup for isolation)
  await prisma.subscriptionPackage.deleteMany();
}

/**
 * Seed test database with minimal data
 * 
 * Creates basic test data for integration tests.
 */
export async function seedTestDatabase(prisma: PrismaClient): Promise<{
  superAdmin: { id: string; phone: string };
  testOutlet: { id: string; slug: string };
  testOwner: { id: string; phone: string };
}> {
  // Create SuperAdmin
  const superAdmin = await prisma.user.create({
    data: {
      phone: '6281111111111',
      name: 'Test SuperAdmin',
      pin: '$2a$10$dummy.hash.for.testing', // Dummy hash
      role: 'SUPERADMIN',
      isActive: true,
      isPinSet: true,
    },
  });

  // Create test outlet
  const testOutlet = await prisma.outlet.create({
    data: {
      name: 'Test Outlet',
      slug: 'test-outlet',
      address: 'Test Address',
      isPro: false,
    },
  });

  // Create test owner
  const testOwner = await prisma.user.create({
    data: {
      phone: '6282222222222',
      name: 'Test Owner',
      pin: '$2a$10$dummy.hash.for.testing',
      role: 'OWNER',
      outletId: testOutlet.id,
      isActive: true,
      isPinSet: true,
    },
  });

  return {
    superAdmin: { id: superAdmin.id, phone: superAdmin.phone },
    testOutlet: { id: testOutlet.id, slug: testOutlet.slug },
    testOwner: { id: testOwner.id, phone: testOwner.phone },
  };
}
