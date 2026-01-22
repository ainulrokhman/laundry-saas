# Code Style Guide

Panduan style code untuk Laundry SaaS Platform.

## 📝 General Rules

### Naming Conventions

- **Files**: `PascalCase.ts` untuk components, `camelCase.ts` untuk utilities
- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`
- **Functions**: `camelCase`

### Example

```typescript
// ✅ Good
const userName = "John";
const MAX_RETRIES = 3;
interface OrderService { }
function calculateTotal() { }

// ❌ Bad
const user_name = "John";
const maxRetries = 3;
interface orderService { }
function CalculateTotal() { }
```

## 🎨 TypeScript

### Use TypeScript Strictly

```typescript
// ✅ Good
function processOrder(order: Order): Promise<OrderDTO> {
  // ...
}

// ❌ Bad
function processOrder(order: any): any {
  // ...
}
```

### Prefer Interfaces for Objects

```typescript
// ✅ Good
interface CreateOrderDTO {
  customerName: string;
  totalAmount: number;
}

// ❌ Bad
type CreateOrderDTO = {
  customerName: string;
  totalAmount: number;
}
```

## 📦 Imports

### Order Imports

1. External packages
2. Internal modules (from `@/`)
3. Relative imports
4. Types (with `type` keyword)

```typescript
// ✅ Good
import { z } from "zod";
import { OrderService } from "@/services/OrderService";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/types/entities/Order";

// ❌ Bad - Mixed order
import { formatCurrency } from "@/lib/utils";
import { z } from "zod";
```

## 🏗️ Code Organization

### File Structure

```typescript
// 1. Imports
import { ... } from "...";

// 2. Types/Interfaces
interface MyInterface { }

// 3. Constants
const CONSTANT = "value";

// 4. Functions/Classes
export function myFunction() { }
export class MyClass { }
```

### Function Length

- Keep functions under 50 lines
- Extract complex logic to separate functions
- Use descriptive function names

## 🎯 SOLID Principles

### Single Responsibility

```typescript
// ✅ Good - One responsibility
class OrderRepository {
  async findAll(outletId: string): Promise<Order[]> { }
}

// ❌ Bad - Multiple responsibilities
class OrderRepository {
  async findAll() { }
  async sendEmail() { } // Wrong!
}
```

## 📝 Comments

### When to Comment

- Complex business logic
- Non-obvious code
- Public APIs
- TODO/FIXME notes

```typescript
// ✅ Good
/**
 * Calculate order total including tax and discounts
 * @param order - Order object
 * @returns Total amount in IDR
 */
function calculateOrderTotal(order: Order): number {
  // Complex calculation logic
}

// ❌ Bad - Obvious code
// Increment counter
counter++;
```

## 🧪 Testing

### Test Naming

```typescript
// ✅ Good
describe("OrderService", () => {
  it("should create order with valid data", () => { });
  it("should throw error when outletId is missing", () => { });
});
```

## 🔧 ESLint & Prettier

### Run Before Commit

```bash
npm run lint:fix
npm run format
```

### Prettier Config

- 2 spaces indentation
- Single quotes for strings
- Semicolons required
- 80 character line width

## 📚 Best Practices

1. **Use async/await** instead of promises
2. **Handle errors** properly with try/catch
3. **Validate inputs** with Zod
4. **Use DTOs** for API responses
5. **Filter by outletId** in all queries

## 🔗 References

- [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
