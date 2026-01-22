# Panduan Penggunaan Tenant Isolation Helpers

## 📋 Daftar Isi
1. [Setup Testing Framework](#setup-testing-framework)
2. [Penggunaan di Service Layer](#penggunaan-di-service-layer)
3. [Penggunaan di API Routes](#penggunaan-di-api-routes)
4. [Penggunaan di Server Components](#penggunaan-di-server-components)
5. [Penggunaan di Client Components](#penggunaan-di-client-components)

---

## 🧪 Setup Testing Framework

### Install Dependencies

```bash
npm install --save-dev jest @jest/globals @testing-library/react @testing-library/jest-dom ts-jest @types/jest
```

### Setup Jest Config

Buat file `jest.config.js`:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

module.exports = createJestConfig(customJestConfig)
```

### Setup Jest

Buat file `jest.setup.js`:

```javascript
import '@testing-library/jest-dom'
```

### Update package.json

Tambahkan script test:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### Jalankan Test

```bash
npm test
```

---

## 🔧 Penggunaan di Service Layer

### Contoh: Order Service

```typescript
// src/services/OrderService.ts
import { requireAuth } from "@/lib/auth-helpers";
import { buildTenantWhere, verifyTenantAccess } from "@/lib/tenant-helpers";
import { prisma } from "@/lib/prisma";

export class OrderService {
  /**
   * Get orders dengan tenant isolation
   */
  async getOrders() {
    // 1. Get session (wajib)
    const session = await requireAuth();
    
    // 2. Build where clause dengan outletId filter
    const where = buildTenantWhere(session, {
      status: "QUEUED", // Filter tambahan
    });

    // 3. Query dengan tenant filter
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 4. Return DTO (scrub sensitive fields)
    return orders.map((order) => ({
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      totalAmount: order.totalAmount,
      // Exclude: outletId, internal fields
    }));
  }

  /**
   * Get order by ID dengan tenant isolation
   */
  async getOrderById(orderId: string) {
    const session = await requireAuth();

    // Build where dengan tenant filter
    const where = buildTenantWhere(session, { id: orderId });

    const order = await prisma.order.findFirst({ where });

    if (!order) {
      throw new Error("Order not found");
    }

    // Double check: verify access
    verifyTenantAccess(session, order.outletId);

    // Return DTO
    return {
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      totalAmount: order.totalAmount,
    };
  }

  /**
   * Create order - gunakan session.outletId (JANGAN dari client)
   */
  async createOrder(data: { totalAmount: number }) {
    const session = await requireAuth();

    // ✅ CORRECT: Gunakan session.outletId
    const order = await prisma.order.create({
      data: {
        ...data,
        outletId: session.outletId, // Dari session, bukan client
        trackingCode: this.generateTrackingCode(),
        status: "QUEUED",
        paymentStatus: "UNPAID",
      },
    });

    return {
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
    };
  }

  /**
   * Update order dengan tenant isolation
   */
  async updateOrder(orderId: string, data: { status: string }) {
    const session = await requireAuth();

    // Verify order exists dan user punya akses
    const where = buildTenantWhere(session, { id: orderId });
    const existingOrder = await prisma.order.findFirst({ where });

    if (!existingOrder) {
      throw new Error("Order not found");
    }

    // Update dengan tenant filter
    const updated = await prisma.order.update({
      where: {
        id: orderId,
        outletId: session.outletId, // Tenant filter
      },
      data,
    });

    return {
      id: updated.id,
      trackingCode: updated.trackingCode,
      status: updated.status,
    };
  }

  private generateTrackingCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}
```

---

## 🌐 Penggunaan di API Routes

### Contoh: GET /api/orders

```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { buildTenantWhere } from "@/lib/tenant-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 1. Get session
    const session = await requireAuth();

    // 2. Build tenant filter
    const where = buildTenantWhere(session, {
      // Optional: filter tambahan dari query params
      status: request.nextUrl.searchParams.get("status") || undefined,
    });

    // 3. Query dengan tenant filter
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 4. Return DTO
    return NextResponse.json({
      data: orders.map((order) => ({
        id: order.id,
        trackingCode: order.trackingCode,
        status: order.status,
        totalAmount: order.totalAmount,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 401 }
    );
  }
}
```

### Contoh: POST /api/orders

```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createOrderSchema = z.object({
  totalAmount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Get session
    const session = await requireAuth();

    // 2. Validate input
    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // 3. Create dengan session.outletId (JANGAN dari body)
    const order = await prisma.order.create({
      data: {
        totalAmount: validatedData.totalAmount,
        outletId: session.outletId, // ✅ Dari session
        trackingCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        status: "QUEUED",
        paymentStatus: "UNPAID",
      },
    });

    return NextResponse.json({
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Contoh: GET /api/orders/[id]

```typescript
// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { buildTenantWhere, verifyTenantAccess } from "@/lib/tenant-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const orderId = params.id;

    // Build where dengan tenant filter
    const where = buildTenantWhere(session, { id: orderId });

    const order = await prisma.order.findFirst({ where });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify access
    verifyTenantAccess(session, order.outletId);

    // Return DTO
    return NextResponse.json({
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      totalAmount: order.totalAmount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 401 }
    );
  }
}
```

---

## 📄 Penggunaan di Server Components

### Contoh: Orders Page

```typescript
// app/dashboard/orders/page.tsx
import { requireAuth } from "@/lib/auth-helpers";
import { buildTenantWhere } from "@/lib/tenant-helpers";
import { prisma } from "@/lib/prisma";

export default async function OrdersPage() {
  // 1. Get session
  const session = await requireAuth();

  // 2. Build tenant filter
  const where = buildTenantWhere(session);

  // 3. Query dengan tenant filter
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div>
      <h1>Orders</h1>
      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            {order.trackingCode} - {order.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🎨 Penggunaan di Client Components

### Menggunakan OutletProvider

```typescript
// app/dashboard/page.tsx (Client Component)
"use client";

import { useOutlet, useOutletId, useIsOwner } from "@/components/providers/OutletProvider";

export default function DashboardPage() {
  // Get outlet context
  const { outletId, role, isOwner, isStaff } = useOutlet();
  
  // Atau gunakan hooks spesifik
  const outletId2 = useOutletId();
  const isOwner2 = useIsOwner();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Outlet ID: {outletId}</p>
      <p>Role: {role}</p>
      {isOwner && <button>Owner Only Action</button>}
      {isStaff && <p>Staff View</p>}
    </div>
  );
}
```

**Penting:** 
- Client components hanya untuk UI
- **JANGAN** gunakan `outletId` dari client untuk API calls
- Selalu verifikasi di server-side

---

## ⚠️ Common Mistakes

### ❌ WRONG: Missing tenant filter

```typescript
// ❌ Missing outletId filter
const orders = await prisma.order.findMany({
  where: { status: "QUEUED" } // Missing outletId!
});
```

### ❌ WRONG: Trusting client outletId

```typescript
// ❌ Jangan percaya outletId dari client
const order = await prisma.order.create({
  data: {
    outletId: request.body.outletId, // ❌ Never trust client!
  },
});
```

### ✅ CORRECT: Always use session

```typescript
// ✅ Selalu gunakan session.outletId
const session = await requireAuth();
const where = buildTenantWhere(session, { status: "QUEUED" });
const orders = await prisma.order.findMany({ where });
```

---

## 📚 Helper Functions Reference

### auth-helpers.ts

- `getSession()` - Get current session
- `requireAuth()` - Require authentication (throws if not)
- `requireRole(role)` - Require specific role
- `requireOutletAccess(outletId)` - Require outlet access
- `getTenantFilter()` - Get tenant filter for queries

### tenant-helpers.ts

- `buildTenantWhere(session, where)` - Build Prisma where dengan outletId filter
- `verifyTenantAccess(session, outletId)` - Verify tenant access
- `canAccessOutlet(session, outletId)` - Check access (boolean)
- `requireOutletId(session)` - Get outletId from session

### OutletProvider (Client)

- `useOutlet()` - Get outlet context
- `useOutletId()` - Get outlet ID
- `useIsOwner()` - Check if owner
- `useIsStaff()` - Check if staff
- `useIsSuperAdmin()` - Check if super admin

---

## 🎯 Best Practices

1. **Selalu gunakan `buildTenantWhere()`** untuk semua database queries
2. **Jangan percaya client-side outletId** - selalu gunakan `session.outletId`
3. **Gunakan DTO pattern** - scrub sensitive fields dari response
4. **Verify access** sebelum update/delete operations
5. **Handle errors** dengan proper HTTP status codes
