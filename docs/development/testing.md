# Testing Guide

Panduan testing untuk Laundry SaaS Platform.

## 🧪 Testing Strategy

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Fast execution
- High coverage

### Integration Tests
- Test API endpoints
- Test database interactions
- Test service-repository integration

### E2E Tests
- Test complete user flows
- Test critical paths
- Browser automation

## 🛠️ Testing Tools

- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing
- **Supertest** - API endpoint testing
- **Playwright** - E2E testing (optional)

## 📝 Unit Testing

### Example: Service Test

```typescript
// src/services/__tests__/OrderService.test.ts
import { OrderService } from "../OrderService";
import { OrderRepository } from "@/repositories/OrderRepository";

jest.mock("@/repositories/OrderRepository");

describe("OrderService", () => {
  let orderService: OrderService;
  let mockRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    mockRepository = new OrderRepository() as jest.Mocked<OrderRepository>;
    orderService = new OrderService(mockRepository);
  });

  it("should create order with valid data", async () => {
    const orderData = {
      customerName: "John Doe",
      totalAmount: 50000,
      outletId: "outlet-123",
    };

    mockRepository.create.mockResolvedValue({
      id: "order-123",
      ...orderData,
      trackingCode: "ABC12345",
      status: "QUEUED",
    });

    const result = await orderService.createOrder(orderData);

    expect(result).toHaveProperty("id");
    expect(result.trackingCode).toHaveLength(8);
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining(orderData)
    );
  });
});
```

### Example: Utility Test

```typescript
// src/lib/__tests__/utils.test.ts
import { formatCurrency, generateTrackingCode } from "../utils";

describe("formatCurrency", () => {
  it("should format IDR correctly", () => {
    expect(formatCurrency(50000)).toBe("Rp50.000");
    expect(formatCurrency(1000000)).toBe("Rp1.000.000");
  });
});

describe("generateTrackingCode", () => {
  it("should generate 8 character code", () => {
    const code = generateTrackingCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});
```

## 🔗 Integration Testing

### Example: API Endpoint Test

```typescript
// app/api/orders/__tests__/route.test.ts
import { POST } from "../route";
import { getServerSession } from "next-auth";

jest.mock("next-auth");

describe("POST /api/orders", () => {
  it("should create order with valid session", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: "user-123",
        outletId: "outlet-123",
        role: "OWNER",
      },
    });

    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: "John Doe",
        totalAmount: 50000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty("id");
  });

  it("should return 401 without session", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: "John Doe",
        totalAmount: 50000,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

## 🧪 Testing Tenant Isolation

```typescript
describe("Tenant Isolation", () => {
  it("should not allow Owner A to access Owner B's orders", async () => {
    // Create orders for different outlets
    const orderA = await createOrder({ outletId: "outlet-a" });
    const orderB = await createOrder({ outletId: "outlet-b" });

    // Try to access with outlet-a session
    const sessionA = { outletId: "outlet-a", role: "OWNER" };
    const orders = await orderService.getAll(sessionA.outletId);

    expect(orders).toContainEqual(expect.objectContaining({ id: orderA.id }));
    expect(orders).not.toContainEqual(
      expect.objectContaining({ id: orderB.id })
    );
  });
});
```

## 📊 Test Coverage

Target coverage:
- **Services**: > 80%
- **Repositories**: > 80%
- **Utilities**: > 90%
- **API Routes**: > 70%

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test OrderService.test.ts
```

## ✅ Best Practices

1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **Arrange-Act-Assert pattern**
4. **Mock external dependencies**
5. **Test edge cases and error scenarios**
6. **Keep tests independent**
7. **Clean up after tests**

## 🔗 References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
