# Testing Framework Setup

## 📋 Overview

Proyek ini menggunakan **Jest** sebagai testing framework dengan **React Testing Library** untuk testing komponen React.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

**Note:** Jika ada peer dependency conflict (karena React 19), gunakan:
```bash
npm install --legacy-peer-deps
```

Dependencies yang diinstall:
- `jest` - Testing framework
- `@jest/globals` - Jest globals untuk TypeScript
- `jest-environment-jsdom` - DOM environment untuk React tests
- `@testing-library/react` - Testing utilities untuk React
- `@testing-library/jest-dom` - Custom matchers untuk DOM
- `@testing-library/user-event` - User interaction simulation
- `@types/jest` - TypeScript types untuk Jest

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

## 📁 File Structure

```
.
├── jest.config.js          # Jest configuration
├── jest.setup.js          # Test setup file
├── src/
│   └── __tests__/        # Test files
│       ├── *.test.ts      # Unit tests
│       └── *.test.tsx     # Component tests
└── coverage/              # Coverage reports (gitignored)
```

## ⚙️ Configuration

### jest.config.js

Konfigurasi Jest sudah disetup untuk:
- ✅ Next.js 16+ compatibility
- ✅ TypeScript support
- ✅ Path aliases (@/*) mapping
- ✅ React component testing
- ✅ Coverage collection

### jest.setup.js

Setup file yang berisi:
- Testing Library matchers
- Next.js router mocks
- Next.js Image component mock
- Environment variables untuk testing

## 📝 Writing Tests

### Unit Test Example

```typescript
// src/lib/__tests__/utils.test.ts
import { describe, it, expect } from '@jest/globals';

describe('Utility Functions', () => {
  it('should add two numbers', () => {
    expect(1 + 1).toBe(2);
  });
});
```

### Component Test Example

```typescript
// src/components/__tests__/Button.test.tsx
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  it('should render button text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Test dengan Tenant Helpers

```typescript
// src/lib/__tests__/tenant-helpers.test.ts
import { describe, it, expect } from '@jest/globals';
import { buildTenantWhere } from '../tenant-helpers';
import { Role } from '@/types/enums/Role';

describe('buildTenantWhere', () => {
  it('should add outletId filter for OWNER', () => {
    const session = {
      outletId: 'outlet-1',
      role: Role.OWNER,
    };
    
    const where = buildTenantWhere(session, { status: 'ACTIVE' });
    expect(where).toEqual({
      status: 'ACTIVE',
      outletId: 'outlet-1',
    });
  });
});
```

## 🎯 Test Categories

### 1. Unit Tests
- Test individual functions
- Test utilities
- Test helpers

**Location:** `src/**/__tests__/*.test.ts`

### 2. Integration Tests
- Test service layer
- Test repository layer
- Test API routes

**Location:** `src/**/__tests__/*.test.ts`

### 3. Component Tests
- Test React components
- Test UI interactions
- Test hooks

**Location:** `src/**/__tests__/*.test.tsx`

## 📊 Coverage

### Generate Coverage Report

```bash
npm run test:coverage
```

Coverage report akan di-generate di folder `coverage/`.

### View Coverage

Buka `coverage/lcov-report/index.html` di browser.

### Coverage Thresholds

Thresholds bisa diaktifkan di `jest.config.js`:

```javascript
coverageThresholds: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
},
```

## 🔧 Mocking

### Mock Next.js Modules

Sudah di-setup di `jest.setup.js`:
- `next/navigation` - Router, pathname, searchParams
- `next/image` - Image component

### Mock Custom Modules

```typescript
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
    },
  },
}));
```

### Mock NextAuth

```typescript
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
```

## 🐛 Debugging Tests

### Run Single Test File

```bash
npm test -- tenant-helpers.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="should add outletId filter"
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📚 Best Practices

1. **Test Naming**: Use descriptive test names
   ```typescript
   it('should return null for SUPERADMIN (no filter needed)', () => {
     // test code
   });
   ```

2. **Arrange-Act-Assert**: Structure tests clearly
   ```typescript
   it('should filter orders by outletId', () => {
     // Arrange
     const session = createMockSession(Role.OWNER, 'outlet-1');
     
     // Act
     const where = buildTenantWhere(session, { status: 'QUEUED' });
     
     // Assert
     expect(where.outletId).toBe('outlet-1');
   });
   ```

3. **Test Isolation**: Each test should be independent
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

4. **Mock External Dependencies**: Don't test external libraries
   ```typescript
   jest.mock('@/lib/prisma');
   ```

5. **Test Edge Cases**: Test error cases and boundaries
   ```typescript
   it('should throw error if session is null', () => {
     expect(() => buildTenantWhere(null, {})).toThrow();
   });
   ```

## 🚨 Common Issues

### Issue: Module not found

**Solution:** Check path aliases in `jest.config.js` match `tsconfig.json`

### Issue: Next.js components not rendering

**Solution:** Ensure `jest.setup.js` has proper mocks for Next.js modules

### Issue: TypeScript errors in tests

**Solution:** Ensure `@types/jest` is installed and `tsconfig.json` includes test files

## 📖 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)
