# Testing Setup Guide

This guide explains how to set up and run tests for the Laundry SaaS Platform.

## 📋 Test Framework Overview

The project uses two testing frameworks:

1. **Vitest** - Unit tests, component tests, and integration tests
2. **Playwright** - End-to-end (E2E) tests

## 🗄️ Test Database Setup

### Option 1: Separate Test Database (Recommended)

For better isolation, create a separate test database:

1. **Create a new database in Neon.tech:**
   - Go to your Neon.tech dashboard
   - Create a new database project (e.g., `laundry-saas-test`)
   - Copy the connection string

2. **Add to `.env.local`:**
   ```env
   TEST_DATABASE_URL="postgresql://user:password@host:5432/test_database?sslmode=require"
   ```

3. **Sync schema ke test database (db push):**
   ```bash
   npm run prisma:push:test
   ```

> Catatan: suite database tests di repo ini **tidak** akan memakai `DATABASE_URL` demi keamanan.

## 🧪 Running Tests

### Unit & Integration Tests (Vitest)

```bash
# Run all tests
npm run test

# Database tests akan auto-run jika TEST_DATABASE_URL diset
# Pastikan schema test DB sudah di-push:
# npm run prisma:push:test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in UI mode
npm run test:ui

# Run specific test file
npm run test -- verify-cursor-rules.test.ts
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run E2E tests for specific browser
npm run test:e2e -- --project=chromium
```

## 📁 Test File Structure

```
__tests__/
├── setup.ts                    # Vitest setup file
├── verify-cursor-rules.test.ts # Cursor rules compliance tests
└── utils/
    ├── test-db.ts              # Database utilities
    ├── test-helpers.ts         # Common test helpers
    └── factories.ts            # Test data factories

e2e/
└── (E2E test files will go here)

src/
└── (Unit test files alongside source files)
```

## 🛠️ Test Utilities

### Database Utilities

```typescript
import { createTestPrismaClient, cleanupTestDatabase, seedTestDatabase } from '__tests__/utils/test-db';

// Create isolated test client
const prisma = createTestPrismaClient();

// Clean up before/after tests
await cleanupTestDatabase(prisma);

// Seed test data
const { superAdmin, testOutlet, testOwner } = await seedTestDatabase(prisma);
```

### Test Helpers

```typescript
import { createMockSession, createMockRequest, randomString } from '__tests__/utils/test-helpers';

// Create mock session
const session = createMockSession({ outletId: 'test-outlet-id' });

// Create mock request
const request = createMockRequest('POST', { name: 'Test' });

// Generate random data
const randomStr = randomString(10);
```

### Test Data Factories

```typescript
import { createUserData, createOrderData, createOutletData } from '__tests__/utils/factories';

// Create test user
const userData = createUserData({ role: Role.OWNER });

// Create test order
const orderData = createOrderData({ outletId: 'test-outlet-id' });
```

## 📝 Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { someFunction } from '@/lib/utils';

describe('someFunction', () => {
  it('should return expected result', () => {
    const result = someFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestPrismaClient, cleanupTestDatabase } from '__tests__/utils/test-db';
import { createMockSession } from '__tests__/utils/test-helpers';

describe('Order API', () => {
  const prisma = createTestPrismaClient();

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterEach(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it('should create order', async () => {
    const session = createMockSession({ outletId: 'test-outlet-id' });
    // Test implementation
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="phone"]', '6281234567890');
  await page.fill('input[name="pin"]', '123456');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

## ✅ Test Best Practices

1. **Isolation:** Each test should be independent and not rely on other tests
2. **Cleanup:** Always clean up test data after tests
3. **Mocking:** Mock external services (APIs, databases) when appropriate
4. **Coverage:** Aim for high test coverage, especially for critical paths
5. **Naming:** Use descriptive test names that explain what is being tested
6. **AAA Pattern:** Arrange, Act, Assert - structure your tests clearly

## 🔍 Test Coverage

View coverage report:

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory.

## 🐛 Troubleshooting

### Issue: Tests can't connect to database

**Solution:**
- Verify `TEST_DATABASE_URL` is set correctly
- Pastikan menjalankan `npm run prisma:push:test` setelah perubahan schema
- Check database connection string format
- Ensure database is accessible from your network

### Issue: Tests are slow

**Solution:**
- Use `TEST_DATABASE_URL` for faster test database
- Run tests in parallel (Vitest does this by default)
- Mock external API calls instead of making real requests

### Issue: E2E tests fail on CI

**Solution:**
- Ensure Playwright browsers are installed: `npx playwright install --with-deps`
- Check that `NEXTAUTH_URL` is set correctly
- Verify web server starts before tests run

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
