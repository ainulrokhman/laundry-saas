# Security Tests Setup

## Database Requirements

Some security tests require a database connection. These tests will automatically skip if `DATABASE_URL` or `TEST_DATABASE_URL` is not set.

### Tests That Require Database

- `account-lockout.test.ts` - Tests account lockout functionality
- `login-security.test.ts` - Integration tests for login security

### Tests That Don't Require Database

- `rate-limiter.test.ts` - Uses in-memory storage
- `security-log.test.ts` - Tests logging functionality (mocked)

## Setting Up Database for Tests

### ⚠️ IMPORTANT: Database Cleanup Safety

**Tests will NOT clean up data if `TEST_DATABASE_URL` is not set.** This protects your main development/production database from accidental data deletion.

- ✅ **If `TEST_DATABASE_URL` is set**: Tests will clean up test data automatically
- ⚠️ **If only `DATABASE_URL` is set**: Tests will run but cleanup will be **skipped** to protect your data

### Option 1: Use Existing DATABASE_URL (Not Recommended)

If you have `DATABASE_URL` set in your `.env.local`, tests will use it:

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

⚠️ **Warning:** Cleanup will be **skipped** to protect your data. Test data will accumulate in your database.

### Option 2: Use Separate Test Database (✅ Recommended)

1. Create a test database in Neon.tech
2. Add to `.env.local`:
   ```env
   TEST_DATABASE_URL="postgresql://user:password@host:5432/test_database?sslmode=require"
   ```
3. Run migrations on test database:
   ```bash
   DATABASE_URL=$TEST_DATABASE_URL npm run prisma:migrate
   ```

## Running Tests

### Run All Security Tests

```bash
npm test -- __tests__/security
```

### Run Tests That Don't Require Database

```bash
# Rate limiter tests (no database needed)
npm test -- __tests__/security/rate-limiter.test.ts

# Security log tests (no database needed)
npm test -- __tests__/security/security-log.test.ts
```

### Run Database Tests

```bash
# Make sure DATABASE_URL or TEST_DATABASE_URL is set first
npm test -- __tests__/security/account-lockout.test.ts
npm test -- __tests__/security/login-security.test.ts
```

## Test Behavior

- If database is **available**: All tests run normally
- If database is **not available**: Database-dependent tests are automatically skipped with a warning message

This allows you to run non-database tests even without a database connection.
