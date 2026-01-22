# Repositories Layer

This layer follows the **Single Responsibility Principle** - each repository is responsible for data access operations for a specific entity.

## Structure

- Each repository should handle CRUD operations for one entity
- Repositories should not contain business logic
- All database queries should go through repositories
- Repositories implement interfaces to follow Dependency Inversion Principle

## Example Structure

```
repositories/
  ├── interfaces/
  │   └── IOutletRepository.ts
  ├── OutletRepository.ts
  ├── OrderRepository.ts
  └── UserRepository.ts
```

## Usage

Repositories are injected into services, following the Dependency Inversion Principle.
