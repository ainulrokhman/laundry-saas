# Database Schema

Dokumentasi skema database Laundry SaaS Platform.

## 📊 Entity Relationship Diagram

```
Outlet (1) ──< (N) User
Outlet (1) ──< (N) Order
Outlet (1) ──< (N) Service
Order (1) ──< (N) Transaction
```

## 🗄️ Tables

### Outlet

```prisma
model Outlet {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  address   String
  bankInfo  String?
  isPro     Boolean  @default(false)
  createdAt DateTime @default(now())
  
  users      User[]
  services   Service[]
  orders     Order[]
}
```

### User

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  role      Role
  outletId  String
  outlet    Outlet   @relation(fields: [outletId], references: [id])
  createdAt DateTime @default(now())
}
```

### Order

```prisma
model Order {
  id           String        @id @default(uuid())
  trackingCode String        @unique
  status       OrderStatus   @default(QUEUED)
  paymentStatus PaymentStatus @default(UNPAID)
  totalAmount  Float
  outletId     String
  outlet       Outlet        @relation(fields: [outletId], references: [id])
  transactions Transaction[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}
```

### Service

```prisma
model Service {
  id        String   @id @default(uuid())
  name      String
  type      String   // KILOAN, SATUAN, PAKET
  price     Float
  outletId  String
  outlet    Outlet   @relation(fields: [outletId], references: [id])
  createdAt DateTime @default(now())
}
```

### Transaction

```prisma
model Transaction {
  id         String        @id @default(uuid())
  type       TransType
  amount     Float
  proofUrl   String?
  status     PaymentStatus @default(PENDING)
  externalId String?
  orderId    String?
  order      Order?        @relation(fields: [orderId], references: [id])
  outletId   String?
  createdAt  DateTime      @default(now())
}
```

## 🔑 Indexes

- `Outlet.slug` - Unique index for public URLs
- `Order.trackingCode` - Unique index for public tracking
- `User.email` - Unique index for authentication
- `Order.outletId` - Index for tenant filtering
- `User.outletId` - Index for tenant filtering

## 📝 Enums

```prisma
enum Role {
  SUPERADMIN
  OWNER
  STAFF
}

enum OrderStatus {
  QUEUED
  WASHING
  DRYING
  IRONING
  READY
  TAKEN
}

enum PaymentStatus {
  UNPAID
  PENDING
  SETTLEMENT
  FAILURE
}

enum TransType {
  SUBSCRIPTION
  LAUNDRY_ORDER
}
```

## 🔗 References

- [Prisma Schema Documentation](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [Blueprint Database Schema](../../blueprint.md)
