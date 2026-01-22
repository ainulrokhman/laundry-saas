# 📡 API Documentation

Dokumentasi API endpoints untuk Laundry SaaS Platform.

## 📋 Daftar Isi

- [Overview](./overview.md) - Gambaran umum API
- [Authentication](./authentication.md) - Endpoint autentikasi
- [Orders API](./orders.md) - Endpoint untuk orders
- [Outlets API](./outlets.md) - Endpoint untuk outlets
- [Users API](./users.md) - Endpoint untuk users
- [Services API](./services.md) - Endpoint untuk services
- [Transactions API](./transactions.md) - Endpoint untuk transactions
- [Public API](./public.md) - Public endpoints (tracking, dll)

## 🔐 Authentication

Semua API endpoints (kecuali public) memerlukan authentication via NextAuth.js.

```typescript
// Include session cookie in requests
fetch("/api/orders", {
  credentials: "include",
  headers: {
    Cookie: `next-auth.session-token=${sessionToken}`,
  },
});
```

## 📝 Response Format

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
    "message": "Invalid input data",
    "details": { ... }
  }
}
```

## 🔒 Security

- **Authentication**: Required for all private endpoints
- **Authorization**: Role-based access control
- **Tenant Isolation**: Automatic outletId filtering
- **Rate Limiting**: Applied to all endpoints
- **Input Validation**: Zod schemas for all inputs

## 📊 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `500` - Internal Server Error

## 🧪 Testing

API endpoints dapat di-test menggunakan:
- Postman collections
- cURL commands
- Automated tests

---

**Base URL**: `https://your-domain.com/api`
