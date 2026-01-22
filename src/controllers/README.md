# Controllers Layer

This layer handles HTTP requests following the **Single Responsibility Principle** - each controller handles requests for a specific resource.

## Structure

- Controllers handle HTTP request/response
- Controllers validate input using Zod
- Controllers call services for business logic
- Controllers should be thin - minimal logic

## Note

In Next.js App Router, API routes are in `app/api/` directory. Controllers can be used as helper functions or the logic can be directly in route handlers.

## Example Structure

```
controllers/
  ├── OrderController.ts
  ├── OutletController.ts
  └── UserController.ts
```
