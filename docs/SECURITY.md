# Security Features Documentation

This document describes the security features implemented in the Laundry SaaS Platform.

## 1. Rate Limiting

Rate limiting is implemented to prevent brute force attacks and abuse of authentication endpoints.

### Login Rate Limiting
- **Max Attempts**: 5 attempts per 15 minutes per phone number
- **Implementation**: In-memory store (consider Redis for production)
- **Location**: `src/lib/security/rate-limiter.ts`

### OTP Rate Limiting
- **Max Requests**: 3 requests per 10 minutes per phone number
- **Implementation**: In-memory store in `OtpService`
- **Location**: `src/services/auth/OtpService.ts`

### PIN Change Rate Limiting
- **Max Attempts**: 5 attempts per 15 minutes per user
- **Implementation**: In-memory store
- **Location**: `src/app/api/dashboard/settings/change-pin/route.ts`

## 2. Account Lockout

Account lockout is implemented to protect against brute force attacks on user accounts.

### Configuration
- **Max Failed Attempts**: 5 failed login attempts
- **Lockout Duration**: 15 minutes
- **Auto-Unlock**: Account automatically unlocks after lockout period expires

### Implementation
- **Location**: `src/lib/security/account-lockout.ts`
- **Database Fields**: 
  - `failedLoginAttempts`: Counter for failed attempts
  - `lockedUntil`: Timestamp when account will be unlocked

### Behavior
1. Failed login attempts are recorded in the database
2. After 5 failed attempts, account is locked for 15 minutes
3. Successful login resets the failed attempt counter
4. Lockout automatically expires after the duration

## 3. Security Event Logging

All security-related events are logged for audit and monitoring purposes.

### Logged Events
- Login attempts (success and failure)
- OTP requests
- OTP verification
- PIN changes
- Account lockouts
- Rate limit violations

### Implementation
- **Location**: `src/services/security/SecurityLogService.ts`
- **Current**: Console logging (development)
- **Production**: Consider integrating with proper logging service (e.g., Sentry, CloudWatch)

### Event Types
```typescript
enum SecurityEventType {
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  OTP_REQUEST = 'OTP_REQUEST',
  OTP_VERIFY = 'OTP_VERIFY',
  PIN_CHANGE = 'PIN_CHANGE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
```

## 4. CSRF Protection

NextAuth.js v5 includes built-in CSRF protection.

### Implementation
- **Automatic**: NextAuth.js v5 automatically handles CSRF protection
- **CSRF Token**: Stored in secure, httpOnly cookie
- **Verification**: Automatically verified on all authentication requests

### Cookie Configuration
- **httpOnly**: true (prevents JavaScript access)
- **sameSite**: 'lax' (CSRF protection)
- **secure**: true in production (HTTPS only)

## 5. Secure Session Cookies

Session cookies are configured with security best practices.

### Cookie Settings
- **httpOnly**: true (prevents XSS attacks)
- **sameSite**: 'lax' (CSRF protection)
- **secure**: true in production (HTTPS only)
- **path**: '/' (applies to entire site)
- **maxAge**: 30 days

### Cookie Types
1. **sessionToken**: Main session cookie
2. **callbackUrl**: OAuth callback URL storage
3. **csrfToken**: CSRF protection token

## 6. PIN Security

### PIN Requirements
- **Length**: 4-6 digits
- **Storage**: Hashed using bcrypt (10 rounds)
- **Validation**: Server-side validation with Zod

### PIN Change Security
- Old PIN verification required
- Rate limiting (5 attempts per 15 minutes)
- Security event logging
- `pinChangedAt` timestamp tracking

## 7. Multi-Tenancy Security

### Tenant Isolation
- All database queries filter by `outletId` from session
- Never trust client-provided `outletId`
- Route proxy verifies session and outlet context

### Data Protection
- DTO pattern for all API responses
- Sensitive fields scrubbed (passwords, internal IDs)
- Public tracking uses minimal data

## Best Practices

1. **Rate Limiting**: Consider using Redis for distributed rate limiting in production
2. **Logging**: Integrate with proper logging service for production
3. **Monitoring**: Set up alerts for suspicious activity (multiple lockouts, rate limit violations)
4. **Session Management**: Consider shorter session durations for sensitive operations
5. **HTTPS**: Always use HTTPS in production (secure cookies require HTTPS)

## Future Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] IP-based rate limiting
- [ ] Geographic restrictions
- [ ] Device fingerprinting
- [ ] Anomaly detection
- [ ] Security audit logs stored in database
- [ ] Email/SMS notifications for security events
