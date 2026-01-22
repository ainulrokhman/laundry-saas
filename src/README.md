# Source Code Structure

This directory follows SOLID principles and clean architecture patterns.

## Directory Structure

```
src/
├── repositories/     # Data access layer (Single Responsibility)
│   ├── interfaces/   # Repository interfaces (Dependency Inversion)
│   └── *.ts         # Repository implementations
│
├── services/         # Business logic layer (Single Responsibility)
│   ├── interfaces/   # Service interfaces (Dependency Inversion)
│   └── *.ts         # Service implementations
│
├── controllers/      # API request handlers (Single Responsibility)
│   └── *.ts         # Controller implementations
│
├── components/       # Reusable UI components
│   ├── common/      # Common/shared components
│   ├── layout/      # Layout components (Sidebar, Navbar, Footer)
│   └── */          # Feature-specific components
│
├── types/           # TypeScript types and interfaces
│   ├── enums/      # Enumerations (Role, OrderStatus, etc.)
│   ├── entities/   # Entity type definitions
│   └── dtos/       # Data Transfer Objects
│
└── lib/            # Utility functions and helpers
    ├── constants.ts
    ├── utils.ts
    └── *.ts
```

## SOLID Principles Applied

### Single Responsibility Principle (S)
- **Repositories**: Only handle data access
- **Services**: Only contain business logic
- **Controllers**: Only handle HTTP requests/responses
- **Components**: Each component has a single, well-defined purpose

### Open/Closed Principle (O)
- Interfaces allow extension without modification
- Payment processors can be added without changing core code
- New service types can be added by implementing interfaces

### Liskov Substitution Principle (L)
- All repositories implement `IBaseRepository<T>`
- All services implement `IBaseService<T>`
- Implementations can be swapped without breaking code

### Interface Segregation Principle (I)
- Small, focused interfaces (e.g., `IBaseRepository`, `IBaseService`)
- Public API interfaces separate from internal API interfaces
- Components receive only the props they need

### Dependency Inversion Principle (D)
- Services depend on repository interfaces, not implementations
- Controllers depend on service interfaces
- High-level modules don't depend on low-level modules

## Import Paths

Use TypeScript path aliases for clean imports:

```typescript
import { OrderService } from "@/services/OrderService";
import { OrderRepository } from "@/repositories/OrderRepository";
import { OrderStatus } from "@/types/enums/OrderStatus";
import { formatCurrency } from "@/lib/utils";
```

## Multi-Tenancy

All data access operations must include `outletId` for tenant isolation:

```typescript
// ✅ Correct
const orders = await orderRepository.findAll(session.outletId);

// ❌ Wrong - Missing tenant isolation
const orders = await orderRepository.findAll();
```

## Security Best Practices

1. **Tenant Isolation**: Always filter by `outletId`
2. **DTO Pattern**: Never return raw database objects
3. **Input Validation**: Use Zod for all API inputs
4. **Rate Limiting**: Implement for public endpoints
5. **Privacy**: Censor sensitive data in public responses
