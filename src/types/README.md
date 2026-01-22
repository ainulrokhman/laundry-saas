# Types Layer

This layer contains TypeScript type definitions and interfaces used across the application.

## Structure

- Types are organized by domain
- DTOs (Data Transfer Objects) for API responses
- Shared interfaces and enums
- Type definitions that follow Interface Segregation Principle

## Example Structure

```
types/
  ├── entities/
  │   ├── Order.ts
  │   ├── Outlet.ts
  │   └── User.ts
  ├── dtos/
  │   ├── OrderDTO.ts
  │   └── OutletDTO.ts
  ├── enums/
  │   ├── OrderStatus.ts
  │   ├── PaymentStatus.ts
  │   └── Role.ts
  └── api/
      ├── requests.ts
      └── responses.ts
```
