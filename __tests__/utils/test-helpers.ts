/**
 * Test Helpers
 * 
 * Common utilities and helpers for writing tests.
 */

import { Role } from '../../src/generated/prisma';

/**
 * Create a mock session object for testing
 */
export function createMockSession(overrides?: {
  userId?: string;
  outletId?: string;
  role?: Role;
  phone?: string;
  name?: string;
}) {
  return {
    user: {
      id: overrides?.userId || 'test-user-id',
      phone: overrides?.phone || '6281234567890',
      name: overrides?.name || 'Test User',
      role: overrides?.role || Role.OWNER,
    },
    outletId: overrides?.outletId || 'test-outlet-id',
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create a mock request object for API route testing
 */
export function createMockRequest(
  method: string = 'GET',
  body?: any,
  headers?: Record<string, string>
): Request {
  return new Request('http://localhost:3000/api/test', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Create a mock NextAuth getServerSession result
 */
export function createMockGetServerSession(session: any = null) {
  return async () => Promise.resolve(session);
}

/**
 * Generate a random string for testing
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Generate a random phone number for testing
 */
export function randomPhone(): string {
  return `628${Math.floor(1000000000 + Math.random() * 9000000000)}`;
}

/**
 * Generate a random UUID for testing
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Wait for a specified amount of time (useful for async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verify that an object has required fields
 */
export function hasRequiredFields<T extends Record<string, any>>(
  obj: any,
  requiredFields: (keyof T)[]
): obj is T {
  return requiredFields.every((field) => field in obj);
}

/**
 * Verify that an object does NOT have sensitive fields
 */
export function hasNoSensitiveFields(obj: any): boolean {
  const sensitiveFields = ['password', 'pin', 'isPro', 'secretKey', 'apiKey'];
  return !sensitiveFields.some((field) => field in obj);
}
