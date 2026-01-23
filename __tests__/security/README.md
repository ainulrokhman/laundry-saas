# Security Features Tests

This directory contains comprehensive tests for Phase 1.1.8 Security Features implementation.

## Test Files

1. **rate-limiter.test.ts** - Tests for rate limiting utility
   - Tests rate limit checking
   - Tests attempt recording
   - Tests rate limit clearing
   - Tests rate limit info retrieval

2. **account-lockout.test.ts** - Tests for account lockout functionality
   - Tests account lockout detection
   - Tests failed attempt recording
   - Tests automatic unlock after expiration
   - Tests lockout info retrieval

3. **security-log.test.ts** - Tests for security event logging
   - Tests event logging
   - Tests login attempt logging
   - Tests OTP request logging
   - Tests account lockout logging

4. **login-security.test.ts** - Integration tests for login security
   - Tests rate limiting on login
   - Tests account lockout on login
   - Tests combined rate limiting and account lockout
   - Tests security event logging

## Running Tests

```bash
# Run all security tests
npm test -- __tests__/security

# Run specific test file
npm test -- __tests__/security/rate-limiter.test.ts

# Run with coverage
npm run test:coverage -- __tests__/security
```

## Test Requirements

- **Database**: Tests that require database use `createTestPrismaClient()` and `cleanupTestDatabase()`
- **Isolation**: Each test is independent and cleans up after itself
- **Mocking**: External services (like security logging) are mocked where appropriate

## Test Coverage

These tests cover:
- ✅ Rate limiting functionality
- ✅ Account lockout mechanism
- ✅ Security event logging
- ✅ Integration of security features in login flow

## Notes

- Rate limiter tests use in-memory storage (no database required)
- Account lockout tests require database connection
- Security log tests mock console methods to avoid spam
- Integration tests combine multiple security features
