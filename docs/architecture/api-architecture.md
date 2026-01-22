# API Architecture

Dokumentasi arsitektur API untuk Laundry SaaS Platform.

## 🏗️ API Structure

### RESTful Design

API mengikuti RESTful principles:

- `GET /api/resource` - List resources
- `GET /api/resource/:id` - Get single resource
- `POST /api/resource` - Create resource
- `PUT /api/resource/:id` - Update resource
- `DELETE /api/resource/:id` - Delete resource

## 📁 File Structure

```
app/api/
├── auth/
│   └── [...nextauth]/
│       └── route.ts
├── orders/
│   ├── route.ts          # GET, POST /api/orders
│   └── [id]/
│       └── route.ts      # GET, PUT, DELETE /api/orders/:id
├── outlets/
│   └── route.ts
└── users/
    └── route.ts
```

## 🔄 Request Flow

```
Client Request
    ↓
Next.js Middleware (Auth check)
    ↓
API Route Handler
    ↓
Input Validation (Zod)
    ↓
Controller (optional)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Database
    ↓
DTO Transformation
    ↓
Response
```

## 📝 Example API Route

```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { OrderService } from "@/services/OrderService";

const createOrderSchema = z.object({
  customerName: z.string().min(1),
  totalAmount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession();
    if (!session?.outletId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Input Validation
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    // 3. Business Logic
    const orderService = new OrderService();
    const order = await orderService.createOrder({
      ...validated,
      outletId: session.outletId,
    });

    // 4. Response (DTO)
    return NextResponse.json({
      success: true,
      data: toOrderDTO(order),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## 🔐 Security

### Authentication

All private endpoints require authentication:

```typescript
const session = await getServerSession();
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Authorization

Role-based access control:

```typescript
if (session.role !== Role.OWNER && session.role !== Role.SUPERADMIN) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Tenant Isolation

Always filter by `outletId`:

```typescript
const orders = await orderService.getAll(session.outletId);
```

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Order created successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

## 🧪 Testing

### Unit Tests

```typescript
describe("POST /api/orders", () => {
  it("should create order with valid data", async () => {
    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

## 📚 References

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [REST API Design](https://restfulapi.net/)
