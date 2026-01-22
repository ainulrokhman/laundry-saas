# Services Layer

This layer contains business logic following the **Single Responsibility Principle** - each service handles business logic for a specific domain.

## Structure

- Services contain business logic and orchestration
- Services depend on repositories (not directly on database)
- Services can depend on other services
- Services should not contain data access code

## Example Structure

```
services/
  ├── interfaces/
  │   └── IOrderService.ts
  ├── OrderService.ts
  ├── OutletService.ts
  └── UserService.ts
```

## Usage

Services are used by controllers/API routes to handle business logic.
