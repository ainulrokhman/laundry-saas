# Security Architecture

Dokumentasi arsitektur keamanan Laundry SaaS Platform.

## 🔐 Security Layers

### 1. Authentication Layer

**Technology**: NextAuth.js

- Email/Password authentication
- Session management
- JWT tokens
- Secure cookie handling

### 2. Authorization Layer

**Role-Based Access Control (RBAC)**

```typescript
enum Role {
  SUPERADMIN, // Full access to all outlets
  OWNER,      // Full access to own outlet
  STAFF,      // Limited access to own outlet
}
```

### 3. Tenant Isolation Layer

- Strict `outletId` filtering
- Cross-tenant access prevention
- Data leakage protection

### 4. Input Validation Layer

**Technology**: Zod

- Schema validation for all inputs
- Type safety
- SQL injection prevention
- XSS prevention

### 5. Rate Limiting Layer

**Technology**: Vercel Edge

- API rate limiting
- Brute-force protection
- DDoS mitigation

## 🛡️ Security Best Practices

### 1. Never Trust Client Input

```typescript
// ✅ Correct - Validate all inputs
import { z } from "zod";

const createOrderSchema = z.object({
  customerName: z.string().min(1).max(100),
  totalAmount: z.number().positive(),
  outletId: z.string().uuid(), // Validate format
});

export async function POST(request: Request) {
  const body = await request.json();
  const validated = createOrderSchema.parse(body); // Throws if invalid
}
```

### 2. Always Use DTOs for Responses

```typescript
// ❌ Wrong - Expose raw database object
return order; // Contains sensitive fields!

// ✅ Correct - Use DTO
interface OrderDTO {
  id: string;
  trackingCode: string;
  status: OrderStatus;
  totalAmount: number;
  // Exclude: outletId, internal fields, etc.
}

function toOrderDTO(order: Order): OrderDTO {
  return {
    id: order.id,
    trackingCode: order.trackingCode,
    status: order.status,
    totalAmount: order.totalAmount,
  };
}
```

### 3. Tenant Isolation in Every Query

```typescript
// ✅ Correct - Always filter by outletId
const orders = await prisma.order.findMany({
  where: {
    outletId: session.outletId, // From authenticated session
    status: "READY",
  },
});
```

### 4. Password Security

- Use bcrypt for password hashing
- Minimum password requirements
- Password reset with secure tokens
- No password in logs or responses

### 5. API Security

```typescript
// Rate limiting
export const config = {
  runtime: "edge",
};

// CORS configuration
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```

## 🔒 Data Protection

### Sensitive Data Handling

1. **Passwords**: Never stored in plain text, always hashed
2. **Bank Info**: Encrypted at rest
3. **Personal Data**: Privacy protection (name censoring in public)
4. **API Keys**: Stored in environment variables, never in code

### Privacy Protection

```typescript
// Public tracking page - censor names
export function censorName(name: string): string {
  return name
    .split(" ")
    .map((word) => {
      if (word.length <= 2) return word;
      return word[0] + "*".repeat(Math.min(word.length - 1, 3));
    })
    .join(" ");
}
```

## 🚨 Security Threats & Mitigation

| Threat | Impact | Mitigation |
|--------|--------|------------|
| SQL Injection | Critical | Parameterized queries (Prisma), Zod validation |
| XSS | High | Input sanitization, React auto-escaping |
| CSRF | Medium | SameSite cookies, CSRF tokens |
| Data Leakage | Critical | Tenant isolation, DTO pattern |
| Brute Force | Medium | Rate limiting, account lockout |
| Session Hijacking | High | Secure cookies, HTTPS only |
| DDoS | Medium | Vercel Edge protection, rate limiting |

## 🔍 Security Testing

### Checklist

- [ ] Test tenant isolation (cross-tenant access)
- [ ] Test input validation (malicious payloads)
- [ ] Test authentication bypass attempts
- [ ] Test authorization (role-based access)
- [ ] Test rate limiting
- [ ] Test SQL injection attempts
- [ ] Test XSS attempts
- [ ] Test CSRF protection

### Example Security Test

```typescript
describe("Security", () => {
  it("should prevent cross-tenant data access", async () => {
    const orderA = await createOrder({ outletId: "outlet-a" });
    
    const response = await fetch(`/api/orders/${orderA.id}`, {
      headers: {
        Cookie: `session=${createSession({ outletId: "outlet-b" })}`,
      },
    });
    
    expect(response.status).toBe(403); // Forbidden
  });
});
```

## 📋 Security Checklist

### Development
- [ ] All inputs validated with Zod
- [ ] All queries filter by outletId
- [ ] All responses use DTOs
- [ ] No sensitive data in logs
- [ ] Environment variables for secrets

### Deployment
- [ ] HTTPS enabled
- [ ] Secure cookies configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Error messages don't leak info

### Monitoring
- [ ] Security event logging
- [ ] Failed authentication alerts
- [ ] Suspicious activity detection
- [ ] Regular security audits

## 📚 Referensi

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
