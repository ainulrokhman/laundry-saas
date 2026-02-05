# Security Audit: API Endpoints & Tenant Isolation

**Date**: 2026-01-24  
**Phase**: 1.4 - Security Implementation Review & Completion

## Overview

Dokumen ini mencatat audit keamanan untuk semua API endpoints, memastikan:
1. ✅ Tenant isolation (outletId filtering)
2. ✅ Route protection (withAuth/withAdminAuth)
3. ✅ DTO pattern untuk response scrubbing
4. ✅ Zod validation untuk input
5. ✅ Input sanitization

---

## API Endpoints Audit

### ✅ Auth Endpoints (Public)

#### `/api/auth/otp/request` (POST)
- **Status**: ✅ Secure
- **Route Protection**: Public (no auth required, but has rate limiting)
- **Tenant Isolation**: N/A (public endpoint)
- **DTO**: N/A (returns minimal response)
- **Validation**: ✅ Zod schema
- **Rate Limiting**: ✅ 3 requests per 10 minutes per phone
- **Notes**: OTP service handles rate limiting internally

#### `/api/auth/otp/verify` (POST)
- **Status**: ✅ Secure
- **Route Protection**: Public (no auth required)
- **Tenant Isolation**: N/A (public endpoint)
- **DTO**: N/A (returns minimal response)
- **Validation**: ✅ Zod schema
- **Rate Limiting**: ✅ Via OTP service
- **Notes**: OTP verification for registration only

#### `/api/auth/register` (POST)
- **Status**: ✅ Secure
- **Route Protection**: Public (no auth required)
- **Tenant Isolation**: N/A (creates new outlet)
- **DTO**: N/A (returns minimal response)
- **Validation**: ✅ Zod schema
- **Input Sanitization**: ✅ Phone normalization
- **Notes**: Only OWNER role can register

#### `/api/auth/[...nextauth]` (GET, POST)
- **Status**: ✅ Secure
- **Route Protection**: NextAuth.js v5 built-in
- **Tenant Isolation**: ✅ Session includes outletId
- **DTO**: N/A (NextAuth handles response)
- **Validation**: ✅ NextAuth credentials validation
- **Rate Limiting**: ✅ 5 attempts per 15 minutes per phone
- **Account Lockout**: ✅ After 5 failed attempts
- **Notes**: PIN-based authentication with bcrypt

---

### ✅ Dashboard Endpoints (Owner/Staff)

#### `/api/dashboard/stats` (GET)
- **Status**: ✅ Secure
- **Route Protection**: ✅ `withAuth` (OWNER, STAFF)
- **Tenant Isolation**: ✅ Via DashboardService (uses session.outletId)
- **DTO**: ✅ DashboardDTO.statsToResponse()
- **Validation**: N/A (no input)
- **Notes**: Uses BaseRepository pattern with outlet filtering

#### `/api/dashboard/recent-orders` (GET)
- **Status**: ✅ Secure
- **Route Protection**: ✅ `withAuth` (OWNER, STAFF)
- **Tenant Isolation**: ✅ Via DashboardService (uses session.outletId)
- **DTO**: ✅ DashboardDTO.recentOrdersToResponse()
- **Validation**: ✅ Zod schema for query params (limit)
- **Notes**: Uses BaseRepository pattern with outlet filtering

#### `/api/dashboard/settings/change-pin` (POST)
- **Status**: ✅ Secure
- **Route Protection**: ✅ `withAuth` (OWNER, STAFF)
- **Tenant Isolation**: ✅ User ID from session (not outlet-based)
- **DTO**: N/A (returns minimal response)
- **Validation**: ✅ Zod schema
- **Rate Limiting**: ✅ 5 attempts per 15 minutes per user
- **Input Sanitization**: ✅ PIN validation (4-6 digits)
- **Notes**: PIN change requires old PIN verification

---

### ✅ Admin Endpoints (SuperAdmin)

#### `/api/admin/outlets` (GET, POST)
- **Status**: ✅ Secure
- **Route Protection**: ✅ `withAdminAuth` (SUPERADMIN only)
- **Tenant Isolation**: N/A (SuperAdmin can access all outlets)
- **DTO**: ✅ OutletDTO.toResponseArray()
- **Validation**: ✅ Zod schema
- **Input Sanitization**: ✅ Slug generation, string trimming
- **Notes**: SuperAdmin endpoints don't need outlet filtering

#### `/api/admin/outlets/[id]` (GET, PUT, DELETE)
- **Status**: ✅ Secure
- **Route Protection**: ✅ `withAdminAuth` (SUPERADMIN only)
- **Tenant Isolation**: N/A (SuperAdmin can access all outlets)
- **DTO**: ✅ OutletDTO.toResponse()
- **Validation**: ✅ Zod schema + UUID validation
- **Input Sanitization**: ✅ Slug generation, string trimming
- **Notes**: SuperAdmin endpoints don't need outlet filtering

---

## Security Checklist

### ✅ Completed

- [x] All dashboard endpoints use `withAuth` with role restrictions
- [x] All admin endpoints use `withAdminAuth` (SuperAdmin only)
- [x] All endpoints that need outlet filtering use BaseRepository pattern
- [x] DTO pattern implemented for Outlet, Dashboard responses
- [x] Zod validation implemented for all input endpoints
- [x] Rate limiting implemented for auth endpoints
- [x] Account lockout implemented for failed login attempts
- [x] Security headers configured in Next.js config
- [x] Input sanitization utilities created

### 🔄 To Be Extended (Future Endpoints)

- [ ] Order endpoints (will use OrderDTO)
- [ ] Transaction endpoints (will use TransactionDTO)
- [ ] Service endpoints (will use ServiceDTO)
- [ ] Bank Account endpoints (will need BankAccountDTO)
- [ ] Payment Gateway endpoints (will need PaymentGatewayDTO)

---

## Phase 4: Security & Optimization Checklist

### 4.1 Advanced Security

- [x] **Tenant isolation**: Semua query dashboard memakai `outletId` dari session; tidak percaya client.
- [x] **Rate limiting public**: OTP request (per phone), login (per phone), register (per IP), public track (per IP).
- [x] **CSRF mitigation**: Pengecekan Origin/Referer same-origin untuk register; dapat diperluas ke state-changing public API.
- [x] **Security headers**: Next.js config (CSP, HSTS, X-Frame-Options, dll.).
- [x] **Input sanitization**: Zod + `src/lib/utils/sanitize.ts` (sanitizeString, sanitizePhone, sanitizeUrl, dll.).
- [x] **Security audit checklist**: Dokumen ini.

### 4.2 Data Protection

- [x] **DTO untuk response**: OrderDTO, ServiceDTO, OutletDTO, CustomerDTO, TransactionDTO, dll.
- [x] **Response scrubbing**: DTO tidak mengembalikan `password`, `pin`, field sensitif internal.
- [x] **Data masking**: `maskSensitiveData()` di `lib/utils.ts`; utilitas masking di `lib/utils/data-masking.ts`.
- [x] **Audit logging**: SecurityLogService untuk login, OTP, reset PIN, approval/reject admin.
- [ ] **Data retention**: Kebijakan dokumentasi (opsional); penghapusan data lama via cron/script terpisah.

### 4.3 Performance & 4.4 Error Handling

- Lihat development-plan.md Phase 4.3 (indexing, caching, lazy load) dan 4.4 (error boundary, logging).

---

## Recommendations

### 1. DTO Pattern Extension
✅ **Completed**: OrderDTO, TransactionDTO, ServiceDTO created
- Ready to use when Order/Transaction/Service endpoints are implemented

### 2. Input Sanitization
✅ **Completed**: Comprehensive sanitization utilities created
- `sanitizeString()` - Remove dangerous characters
- `sanitizePhone()` - Phone number normalization
- `sanitizeNumber()` - Numeric input validation
- `sanitizeUrl()` - URL validation with protocol checking
- `sanitizeObject()` - Recursive object sanitization

**Recommendation**: Apply sanitization in Zod schemas using `.transform()` or in service layer before database operations.

### 3. Security Headers
✅ **Completed**: Security headers configured in `next.config.mjs`
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: HSTS enabled
- Content-Security-Policy: Configured (with unsafe-inline for AdminLTE)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: Restricted camera, microphone, geolocation

### 4. Future Endpoints Checklist

When implementing new endpoints, ensure:

1. ✅ Use `withAuth` or `withAdminAuth` from route proxy
2. ✅ Include `outletId` in all database queries (except SuperAdmin endpoints)
3. ✅ Use DTO pattern for all responses (never return raw Prisma objects)
4. ✅ Validate all inputs with Zod schemas
5. ✅ Sanitize user inputs before database operations
6. ✅ Implement rate limiting for public/sensitive endpoints
7. ✅ Log security events (login attempts, failed validations, etc.)

---

## Testing Recommendations

1. **Tenant Isolation Tests**: Verify that users cannot access data from other outlets
2. **Authorization Tests**: Verify role-based access control
3. **Input Validation Tests**: Test Zod schemas with invalid inputs
4. **Rate Limiting Tests**: Verify rate limits are enforced
5. **DTO Tests**: Verify sensitive data is scrubbed from responses

---

## Conclusion

**Current Status**: ✅ **SECURE**

All existing API endpoints have been audited and are secure:
- ✅ Tenant isolation implemented via BaseRepository pattern
- ✅ Route protection via route proxy pattern
- ✅ DTO pattern implemented for existing endpoints
- ✅ Zod validation for all inputs
- ✅ Security headers configured
- ✅ Input sanitization utilities ready

**Next Steps**: When implementing new endpoints (Orders, Transactions, Services), use the created DTOs and follow the security checklist above.
