# API Routes

Next.js App Router API routes. Each route should:
- Validate input using Zod
- Handle authentication/authorization
- Call services for business logic
- Return proper HTTP status codes
- Follow DTO pattern for responses (don't expose raw database objects)

## Structure

```
api/
  ├── auth/
  │   └── [...nextauth]/
  ├── outlets/
  │   └── route.ts
  ├── orders/
  │   └── route.ts
  └── users/
      └── route.ts
```

## Security

- Always verify tenant isolation (outlet_id filtering)
- Use DTOs for responses
- Validate all inputs with Zod
- Implement rate limiting for public endpoints
