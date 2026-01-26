# Security Tests Setup

## Database Requirements

Beberapa security tests membutuhkan koneksi database. Di repo ini, database tests akan auto-run jika `TEST_DATABASE_URL` diset.

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

⚠️ Demi keamanan, suite database tests **tidak** akan memakai `DATABASE_URL`.

### Option: Use Separate Test Database (✅ Recommended)

1. Create a test database in Neon.tech
2. Add to `.env.local`:
   ```env
   TEST_DATABASE_URL="postgresql://user:password@host:5432/test_database?sslmode=require"
   ```
3. Sync schema ke test database (db push):
   ```bash
   npm run prisma:push:test
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
# Pastikan TEST_DATABASE_URL diset dan schema test DB sudah di-push
# Sync schema test DB:
npm run prisma:push:test

npm test -- __tests__/security/account-lockout.test.ts
npm test -- __tests__/security/login-security.test.ts

# Atau jalankan semua test:
npm test
```

## Test Behavior

- Jika `TEST_DATABASE_URL` tersedia: database-dependent tests berjalan normal
- Jika `TEST_DATABASE_URL` tidak ada: database-dependent tests otomatis di-skip

This allows you to run non-database tests even without a database connection.
