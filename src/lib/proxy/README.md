# Route Proxy Pattern

This directory contains the route protection proxy implementation, which replaces Next.js middleware for authentication and authorization.

## Why Proxy Instead of Middleware?

- **More explicit**: Each route handler explicitly declares its protection requirements
- **Better type safety**: TypeScript can infer session types in handlers
- **Easier testing**: Proxy functions can be tested independently
- **Flexible authorization**: Custom authorization logic per route
- **No edge runtime limitations**: Works with all Next.js features

## Usage Examples

### Basic Authenticated Route

```typescript
// src/app/api/dashboard/orders/route.ts
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';

export const GET = withAuth(async (request: Request, session: ExtendedSession) => {
  // session.outletId is guaranteed to exist
  const orders = await prisma.order.findMany({
    where: { outletId: session.outletId }
  });
  
  return Response.json({ orders });
});
```

### Admin-Only Route

```typescript
// src/app/api/admin/users/route.ts
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';

export const GET = withAdminAuth(async (request: Request, session: ExtendedSession) => {
  // Only SUPERADMIN can access
  // session.outletId may be null for SUPERADMIN
  const users = await prisma.user.findMany();
  
  return Response.json({ users });
});
```

### Owner-Only Route

```typescript
// src/app/api/dashboard/settings/route.ts
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';

export const GET = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
  // Only OWNER can access
  // session.outletId is guaranteed to exist
  const settings = await prisma.outlet.findUnique({
    where: { id: session.outletId }
  });
  
  return Response.json({ settings });
});
```

### Public Route (Optional Session)

```typescript
// src/app/api/public/track/[code]/route.ts
import { withPublicAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';

export const GET = withPublicAuth(async (
  request: Request, 
  session: ExtendedSession | null
) => {
  // Public route, but session is available if user is logged in
  const { code } = await request.json();
  
  const order = await prisma.order.findUnique({
    where: { trackingCode: code }
  });
  
  return Response.json({ order });
});
```

### Custom Authorization

```typescript
// src/app/api/dashboard/orders/[id]/route.ts
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';

export const GET = withAuth(
  async (request: Request, session: ExtendedSession) => {
    const { id } = await request.json();
    
    const order = await prisma.order.findFirst({
      where: { id, outletId: session.outletId }
    });
    
    return Response.json({ order });
  },
  {
    // Custom authorization: only OWNER or STAFF can view orders
    roles: [Role.OWNER, Role.STAFF],
    requireOutlet: true,
    authorize: async (session) => {
      // Additional custom check
      const outlet = await prisma.outlet.findUnique({
        where: { id: session.outletId }
      });
      return outlet?.isActive ?? false;
    }
  }
);
```

## Available Functions

- `withAuth(handler, options?)` - Basic authentication with optional role/outlet requirements
- `withAdminAuth(handler)` - SUPERADMIN only, no outlet required
- `withOwnerAuth(handler)` - OWNER only, outlet required
- `withPublicAuth(handler)` - Public route, optional session

## Options

```typescript
interface RouteProxyOptions {
  roles?: Role[];              // Required roles (empty = any authenticated user)
  requireOutlet?: boolean;      // Require outletId in session (default: true)
  authorize?: (session) => Promise<boolean> | boolean; // Custom authorization
}
```

## Important Notes

1. **Always use session.outletId** - Never trust client-provided outletId
2. **Filter by outletId** - All database queries must include outletId filter
3. **Use DTOs** - Always transform responses using DTO pattern
4. **Validate inputs** - Use Zod for all input validation
