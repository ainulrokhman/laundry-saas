# Authentication API

Dokumentasi endpoint autentikasi menggunakan NextAuth.js.

## 🔐 Endpoints

### Sign In

```http
POST /api/auth/signin
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "OWNER",
      "outletId": "outlet-uuid"
    }
  }
}
```

### Sign Out

```http
POST /api/auth/signout
```

**Response:**
```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

### Get Session

```http
GET /api/auth/session
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "OWNER",
      "outletId": "outlet-uuid"
    },
    "expires": "2024-12-31T23:59:59.000Z"
  }
}
```

## 🔑 Session Structure

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role; // SUPERADMIN | OWNER | STAFF
    outletId: string; // Required for tenant isolation
  };
  expires: string;
}
```

## 🛡️ Security

- Passwords are hashed using bcrypt
- Sessions stored in secure HTTP-only cookies
- JWT tokens for stateless authentication
- CSRF protection enabled

## 📝 Usage Examples

### Client-Side (React)

```typescript
import { signIn, signOut, useSession } from "next-auth/react";

// Sign in
await signIn("credentials", {
  email: "user@example.com",
  password: "password123",
  redirect: false,
});

// Sign out
await signOut({ redirect: false });

// Get session
const { data: session } = useSession();
```

### Server-Side (API Routes)

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  // Use session.user.outletId for tenant isolation
  const outletId = session.user.outletId;
}
```

## ⚠️ Error Responses

### Invalid Credentials

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### Account Not Found

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

## 🔗 Related

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Security Architecture](../architecture/security.md)
