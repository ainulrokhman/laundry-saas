/**
 * Test Database Utilities
 * 
 * Utilities for managing test database connections and operations.
 * Uses a separate test database to avoid affecting development data.
 */

import { PrismaClient } from '../../src/generated/prisma';

/**
 * Get test database connection
 * Uses TEST_DATABASE_URL if available, otherwise falls back to DATABASE_URL
 */
export function getTestDatabaseUrl(): string {
  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!testDbUrl) {
    throw new Error(
      'TEST_DATABASE_URL or DATABASE_URL must be set for testing'
    );
  }
  
  return testDbUrl;
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
 * Truncates all tables in the correct order (respecting foreign keys).
 * Use this in beforeEach or afterEach to ensure clean test state.
 */
export async function cleanupTestDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.transaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.service.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.paymentGatewayConfig.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outlet.deleteMany();
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
