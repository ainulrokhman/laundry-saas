# Multi-Tenancy Architecture

Dokumentasi implementasi multi-tenancy dalam Laundry SaaS Platform.

## 🏢 Konsep Multi-Tenancy

Platform ini menggunakan **shared database, isolated data** pattern dimana:
- Satu database untuk semua tenants (outlets)
- Data diisolasi menggunakan `outlet_id` pada setiap query
- Setiap user hanya bisa mengakses data outlet mereka

## 🔐 Tenant Isolation Strategy

### 1. Database Level

Setiap tabel memiliki kolom `outletId`:

```prisma
model Order {
  id       String @id @default(uuid())
  outletId String
  outlet   Outlet @relation(fields: [outletId], references: [id])
  // ... other fields
}
```

### 2. Repository Level

Semua repository methods menerima `outletId`:

```typescript
interface IBaseRepository<T> {
  findAll(outletId?: string): Promise<T[]>;
  findById(id: string, outletId?: string): Promise<T | null>;
}
```

### 3. Service Level

Services selalu memvalidasi `outletId`:

```typescript
class OrderService {
  async getOrder(id: string, outletId: string): Promise<Order> {
    // Always filter by outletId
    return this.repository.findById(id, outletId);
  }
}
```

### 4. API Level

Middleware memastikan `outletId` dari session:

```typescript
// Middleware
export async function middleware(request: NextRequest) {
  const session = await getSession();
  if (!session?.outletId) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Attach outletId to request
}
```

## 🛡️ Security Rules

### Rule 1: Always Filter by outletId

```typescript
// ✅ Correct
const orders = await prisma.order.findMany({
  where: { outletId: session.outletId }
});

// ❌ Wrong - Data leakage risk!
const orders = await prisma.order.findMany();
```

### Rule 2: Validate Tenant Access

```typescript
// ✅ Correct
async function updateOrder(id: string, outletId: string, data: UpdateOrderDTO) {
  const order = await prisma.order.findFirst({
    where: { id, outletId } // Verify ownership
  });
  
  if (!order) {
    throw new Error("Order not found or access denied");
  }
  
  return prisma.order.update({
    where: { id },
    data
  });
}
```

### Rule 3: SUPERADMIN Exception

SUPERADMIN dapat mengakses semua data:

```typescript
async function findAll(userRole: Role, outletId?: string) {
  if (userRole === Role.SUPERADMIN) {
    return prisma.order.findMany(); // No filter for SUPERADMIN
  }
  
  if (!outletId) {
    throw new Error("outletId required for non-SUPERADMIN users");
  }
  
  return prisma.order.findMany({ where: { outletId } });
}
```

## 🔄 Context Management

### Outlet Context Provider

```typescript
// Context untuk outlet selection (future: multi-outlet support)
export const OutletContext = createContext<{
  outletId: string;
  outlet: Outlet;
} | null>(null);
```

### Session Management

```typescript
// NextAuth session includes outletId
interface Session {
  user: User;
  outletId: string;
  role: Role;
}
```

## 🧪 Testing Tenant Isolation

### Test Cases

1. **Owner A tidak bisa akses data Owner B**
2. **Staff hanya bisa akses data outlet mereka**
3. **SUPERADMIN bisa akses semua data**
4. **API tanpa outletId filter harus di-reject**

### Example Test

```typescript
describe("Tenant Isolation", () => {
  it("should not allow Owner A to access Owner B's orders", async () => {
    const orderA = await createOrder({ outletId: "outlet-a" });
    const orderB = await createOrder({ outletId: "outlet-b" });
    
    const sessionA = { outletId: "outlet-a", role: Role.OWNER };
    const orders = await orderService.getAll(sessionA.outletId);
    
    expect(orders).toContain(orderA);
    expect(orders).not.toContain(orderB);
  });
});
```

## 📊 Data Model

```
Outlet (Tenant)
  ├── Users (isolated by outletId)
  ├── Orders (isolated by outletId)
  ├── Services (isolated by outletId)
  └── Transactions (isolated by outletId)
```

## ⚠️ Common Pitfalls

### ❌ Pitfall 1: Missing outletId Filter

```typescript
// ❌ Wrong
const orders = await prisma.order.findMany({
  where: { status: "READY" } // Missing outletId!
});
```

### ❌ Pitfall 2: Trusting Client outletId

```typescript
// ❌ Wrong
async function updateOrder(id: string, clientOutletId: string) {
  // Never trust client-provided outletId!
  return prisma.order.update({
    where: { id, outletId: clientOutletId }
  });
}

// ✅ Correct
async function updateOrder(id: string, sessionOutletId: string) {
  // Use outletId from authenticated session
  return prisma.order.update({
    where: { id, outletId: sessionOutletId }
  });
}
```

## 🔍 Monitoring & Auditing

- Log semua data access dengan outletId
- Monitor untuk suspicious cross-tenant queries
- Alert jika ada query tanpa outletId filter (except SUPERADMIN)

## 📚 Referensi

- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)
- [Tenant Isolation Best Practices](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
