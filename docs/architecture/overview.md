# Arsitektur Overview

## 🏛️ High-Level Architecture

Laundry SaaS Platform menggunakan arsitektur serverless multi-tenant yang dioptimalkan untuk Vercel deployment.

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  (Browser / Mobile) - AdminLTE Dashboard / Public UI   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 Next.js App Router                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Pages      │  │  API Routes  │  │  Middleware  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Application Layer (src/)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Controllers  │→ │   Services   │→ │ Repositories │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Components   │  │    Types     │  │     Lib      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │  NextAuth.js │  │  Cloudinary  │ │
│  │  (Neon.tech) │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Request Flow

1. **Client Request** → Next.js App Router
2. **Middleware** → Authentication & Authorization check
3. **API Route** → Input validation (Zod)
4. **Controller** → Request handling
5. **Service** → Business logic
6. **Repository** → Data access
7. **Database** → Query execution
8. **Response** → DTO transformation → Client

## 📦 Layer Responsibilities

### Controllers Layer
- Handle HTTP requests/responses
- Input validation
- Error handling
- Response formatting

### Services Layer
- Business logic
- Orchestration
- Transaction management
- Business rules enforcement

### Repositories Layer
- Data access
- Database queries
- Tenant isolation
- Query optimization

### Components Layer
- UI components
- Reusable widgets
- AdminLTE integration
- User interactions

## 🔐 Security Layers

1. **Authentication** - NextAuth.js
2. **Authorization** - Role-based access control
3. **Tenant Isolation** - Outlet ID filtering
4. **Input Validation** - Zod schemas
5. **Rate Limiting** - Vercel Edge
6. **Data Scrubbing** - DTO pattern

## 🌐 Deployment Architecture

- **Platform**: Vercel (Serverless)
- **Region**: Singapore (ap-southeast-1)
- **Database**: Neon.tech PostgreSQL (Singapore)
- **Storage**: Cloudinary / Supabase Storage
- **CDN**: Vercel Edge Network

## 📊 Scalability

- **Horizontal Scaling**: Serverless functions auto-scale
- **Database**: Connection pooling (Neon.tech)
- **Caching**: Vercel KV / Redis (future)
- **CDN**: Static assets via Vercel Edge
