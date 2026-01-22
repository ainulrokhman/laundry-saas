# API Overview

Gambaran umum API Laundry SaaS Platform.

## 🌐 Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## 🔐 Authentication

Semua private endpoints memerlukan authentication via NextAuth.js session cookie.

### How to Authenticate

```typescript
// Browser (automatic with cookies)
fetch("/api/orders", {
  credentials: "include",
});

// Server-side
import { getServerSession } from "next-auth";
const session = await getServerSession();
```

## 📝 Request Format

### Headers

```http
Content-Type: application/json
Cookie: next-auth.session-token=...
```

### Request Body

```json
{
  "customerName": "John Doe",
  "totalAmount": 50000
}
```

## 📤 Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "trackingCode": "ABC12345",
    "status": "QUEUED"
  },
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
    "details": {
      "customerName": "Required field"
    }
  }
}
```

## 📊 HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

## 🔒 Security

- **Authentication**: Required for all private endpoints
- **Authorization**: Role-based (SUPERADMIN, OWNER, STAFF)
- **Tenant Isolation**: Automatic `outletId` filtering
- **Input Validation**: Zod schemas
- **Rate Limiting**: Applied to all endpoints

## 📚 API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get session

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Outlets
- `GET /api/outlets` - List outlets (SUPERADMIN only)
- `POST /api/outlets` - Create outlet (SUPERADMIN only)
- `GET /api/outlets/:id` - Get outlet
- `PUT /api/outlets/:id` - Update outlet

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user

### Services
- `GET /api/services` - List services
- `POST /api/services` - Create service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Public
- `GET /api/track/:trackingCode` - Track order (public, no auth)

## 🧪 Testing

### Using cURL

```bash
# Get orders
curl -X GET http://localhost:3000/api/orders \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{"customerName":"John","totalAmount":50000}'
```

## 📖 Next Steps

- [Authentication API](./authentication.md)
- [Orders API](./orders.md)
- [Outlets API](./outlets.md)
