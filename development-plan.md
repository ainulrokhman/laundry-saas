# 📋 Development Plan: Laundry SaaS Platform

Dokumen ini adalah rencana pengembangan detail untuk membangun sistem Laundry SaaS sesuai dengan blueprint arsitektur.

> **Note**: Pastikan membaca `.cursorrules` untuk guidelines coding, security, dan best practices sebelum memulai development.

---

## 🎯 Overview

**Project**: Laundry SaaS Platform (Ainul Laundry)  
**Framework**: Next.js 16.x LTS (App Router)  
**UI**: AdminLTE v4 (Bootstrap 5)  
**Database**: PostgreSQL (Neon.tech)  
**ORM**: Prisma  
**Auth**: NextAuth.js v5  
**Testing**: Vitest + Playwright  

---

## 📦 Phase 0: Foundation & Setup

### 0.1 Dependencies Installation
- [ ] Install AdminLTE v4 (`admin-lte@4.0.0-rc4`)
- [ ] Install Bootstrap 5
- [ ] Install Prisma (`@prisma/client`, `prisma`)
- [ ] Install NextAuth.js v5 (`next-auth`)
- [ ] Install Zod untuk validasi (`zod`)
- [ ] Install Vitest dan dependencies (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`)
- [ ] Install Playwright (`@playwright/test`)
- [ ] Install FontAwesome icons
- [ ] Install utility libraries (`date-fns`, `uuid`)

### 0.2 Database Setup
- [ ] Setup Neon.tech PostgreSQL database (Singapore region)
- [ ] Konfigurasi Prisma schema sesuai blueprint
  - [ ] Enum: Role, OrderStatus, PaymentStatus, TransType
  - [ ] Model: User, Outlet, Service, Order, Transaction
  - [ ] Relasi antar model
- [ ] Generate Prisma Client
- [ ] Setup Prisma migrations
- [ ] Seed database dengan data awal (SuperAdmin user)

### 0.3 Environment Configuration
- [ ] Setup `.env.local` dari `.env.example`
- [ ] Konfigurasi `DATABASE_URL`
- [ ] Konfigurasi `NEXTAUTH_URL` dan `NEXTAUTH_SECRET`
- [ ] Konfigurasi Cloudinary/Supabase Storage (opsional)
- [ ] Setup environment variables untuk Vercel

### 0.4 Testing Setup
- [ ] Konfigurasi Vitest (`vitest.config.ts`)
- [ ] Konfigurasi Playwright (`playwright.config.ts`)
- [ ] Setup test utilities dan helpers
- [ ] Setup test database (separate schema untuk testing)
- [ ] Tambahkan test scripts di `package.json`
- [x] Buat verification tests untuk cursor rules compliance (`__tests__/verify-cursor-rules.test.ts`)

### 0.5 Project Structure (SOLID Principles)
- [ ] Buat struktur folder:
  ```
  src/
  ├── app/                    # Next.js App Router
  ├── components/             # Reusable UI components
  │   ├── adminlte/          # AdminLTE components
  │   └── ui/                # Custom UI components
  ├── lib/                   # Utilities & configs
  │   ├── prisma.ts         # Prisma client singleton
  │   ├── auth.ts           # NextAuth config
  │   └── utils.ts           # Helper functions
  ├── repositories/         # Data access layer
  ├── services/             # Business logic layer
  ├── api/                  # API route handlers
  ├── types/                # TypeScript types
  ├── dto/                  # Data Transfer Objects
  └── middleware.ts         # Next.js middleware
  ```

### 0.6 Cursor Rules Setup
- [x] Buat `.cursorrules` file dengan guidelines lengkap
- [ ] Review dan pastikan semua developer memahami cursor rules
- [ ] Setup pre-commit hooks untuk code quality (opsional)

---

## 🏗️ Phase 1: AdminLTE Dashboard Setup & Multi-Tenancy

### 1.1 Authentication System
- [ ] Setup NextAuth.js v5 dengan credentials provider
- [ ] Implementasi role-based access (SUPERADMIN, OWNER, STAFF)
- [ ] Buat User model di Prisma schema
- [ ] Setup session management dengan outletId
- [ ] Buat login page dengan AdminLTE styling
- [ ] Implementasi middleware untuk route protection
- [ ] Buat API route untuk authentication (`/api/auth/[...nextauth]`)

### 1.2 AdminLTE Layout Integration
- [ ] Install dan import AdminLTE CSS/JS
- [ ] Buat layout component untuk dashboard (`components/adminlte/DashboardLayout.tsx`)
- [ ] Implementasi Sidebar Navigation dengan role-based menu
- [ ] Implementasi Navbar dengan user info
- [ ] Implementasi Footer
- [ ] Setup responsive design (mobile sidebar toggle)
- [ ] Integrasi FontAwesome icons

### 1.3 Multi-Tenancy Foundation
- [ ] Buat middleware untuk tenant isolation
- [ ] Implementasi outlet context/provider
- [ ] Buat utility function untuk outlet filtering
- [ ] Setup repository pattern untuk data access
- [ ] Implementasi base repository dengan outlet filtering
- [ ] Buat service layer untuk business logic

### 1.4 Database Models (Complete Schema)
- [ ] Implementasi User model lengkap
- [ ] Implementasi Outlet model lengkap
- [ ] Implementasi Service model (untuk layanan laundry)
- [ ] Implementasi Order model lengkap dengan relasi
- [ ] Implementasi Transaction model lengkap
- [ ] Setup semua relasi antar model
- [ ] Run Prisma migrations

### 1.5 Dashboard Homepage
- [ ] Buat dashboard page (`app/dashboard/page.tsx`)
- [ ] Implementasi Cards & Widgets (AdminLTE Info Box)
  - [ ] Order hari ini
  - [ ] Omzet hari ini
  - [ ] Cucian tertunda
  - [ ] Total pelanggan
- [ ] Buat chart/graph untuk statistik (opsional)
- [ ] Implementasi recent orders table
- [ ] Setup role-based dashboard content

### 1.6 Outlet Management (SuperAdmin)
- [ ] Buat halaman list outlets (`app/admin/outlets/page.tsx`)
- [ ] Implementasi CRUD untuk outlets
- [ ] Buat form create/edit outlet dengan AdminLTE styling
- [ ] Implementasi outlet slug generation
- [ ] Buat halaman detail outlet
- [ ] Implementasi outlet status management

### 1.7 Outlet Microsite (Public)
- [ ] Buat dynamic route `/outlet/[slug]`
- [ ] Buat halaman publik outlet dengan desain minimalis
- [ ] Display outlet information (nama, alamat, kontak)
- [ ] Display services yang tersedia
- [ ] Buat form quick order (opsional untuk Fase 1)
- [ ] Implementasi SEO-friendly metadata

### 1.8 User Management
- [ ] Buat halaman user management (`app/admin/users/page.tsx`)
- [ ] Implementasi CRUD untuk users
- [ ] Buat form assign user ke outlet
- [ ] Implementasi role assignment
- [ ] Buat halaman profile user
- [ ] Implementasi change password

### 1.9 Security Implementation (Phase 1)
- [ ] Implementasi tenant isolation di semua queries
- [ ] Buat DTO untuk response scrubbing
- [ ] Implementasi middleware untuk outlet verification
- [ ] Setup rate limiting untuk auth endpoints
- [ ] Implementasi Zod validation untuk forms

---

## 🛒 Phase 2: POS dengan UI AdminLTE

### 2.1 Service Management
- [ ] Buat halaman service management (`app/dashboard/services/page.tsx`)
- [ ] Implementasi CRUD untuk services per outlet
- [ ] Buat form service dengan AdminLTE styling
- [ ] Implementasi service categories (Kiloan, Satuan, Paket)
- [ ] Implementasi pricing management
- [ ] Buat datatable dengan Bootstrap DataTables

### 2.2 Order Management (POS)
- [ ] Buat halaman POS (`app/dashboard/orders/new/page.tsx`)
- [ ] Implementasi order creation form
- [ ] Buat service selection interface
- [ ] Implementasi quantity & price calculation
- [ ] Buat order summary component
- [ ] Implementasi order status workflow
- [ ] Buat order list page dengan datatable
- [ ] Implementasi filter dan search orders

### 2.3 Order Workflow Visualization
- [ ] Buat halaman order detail (`app/dashboard/orders/[id]/page.tsx`)
- [ ] Implementasi AdminLTE Steps/Timeline untuk workflow
- [ ] Visualisasi status: QUEUED → WASHING → DRYING → IRONING → READY → TAKEN
- [ ] Implementasi status update buttons
- [ ] Buat history log untuk status changes
- [ ] Implementasi real-time status updates (opsional)

### 2.4 Order Tracking (Public)
- [ ] Buat halaman public tracking (`app/track/[code]/page.tsx`)
- [ ] Implementasi tracking code lookup
- [ ] Display minimal order information (privacy-focused)
- [ ] Implementasi status visualization untuk public
- [ ] Buat form untuk input tracking code
- [ ] Implementasi rate limiting untuk tracking page

### 2.5 Digital Invoice/Nota
- [ ] Buat halaman invoice (`app/dashboard/orders/[id]/invoice/page.tsx`)
- [ ] Implementasi invoice template dengan AdminLTE styling
- [ ] Display order details, customer info, services
- [ ] Implementasi print functionality
- [ ] Buat share to WhatsApp functionality
- [ ] Implementasi PDF download (opsional)

### 2.6 Customer Management
- [ ] Buat model Customer di Prisma
- [ ] Buat halaman customer list (`app/dashboard/customers/page.tsx`)
- [ ] Implementasi CRUD untuk customers
- [ ] Buat customer detail page dengan order history
- [ ] Implementasi customer search
- [ ] Buat quick customer selection di POS

### 2.7 Order Reports
- [ ] Buat halaman reports (`app/dashboard/reports/page.tsx`)
- [ ] Implementasi daily/weekly/monthly reports
- [ ] Buat chart untuk order statistics
- [ ] Implementasi export to Excel/PDF (opsional)
- [ ] Buat filter by date range

---

## 💳 Phase 3: Sistem Pembayaran Manual & Admin Panel

### 3.1 Payment Proof Upload (B2C)
- [ ] Buat halaman payment upload (`app/track/[code]/payment/page.tsx`)
- [ ] Implementasi file upload untuk bukti transfer
- [ ] Integrasi dengan Cloudinary/Supabase Storage
- [ ] Buat form upload dengan AdminLTE styling
- [ ] Implementasi image preview
- [ ] Buat payment status display
- [ ] Implementasi validation untuk upload

### 3.2 Payment Verification (B2B - SuperAdmin)
- [ ] Buat halaman payment verification (`app/admin/payments/page.tsx`)
- [ ] Implementasi list pending payments
- [ ] Buat AdminLTE Info Box untuk payment status
- [ ] Implementasi approve/reject payment
- [ ] Buat payment detail modal
- [ ] Implementasi payment history
- [ ] Buat notification system untuk payment status

### 3.3 Subscription Management
- [ ] Buat halaman subscription management (`app/admin/subscriptions/page.tsx`)
- [ ] Implementasi subscription status per outlet
- [ ] Buat subscription renewal interface
- [ ] Implementasi subscription expiry tracking
- [ ] Buat subscription payment verification
- [ ] Implementasi auto-disable features untuk expired subscription

### 3.4 Transaction Management
- [ ] Buat halaman transaction list (`app/dashboard/transactions/page.tsx`)
- [ ] Implementasi filter by type (SUBSCRIPTION, LAUNDRY_ORDER)
- [ ] Buat transaction detail page
- [ ] Implementasi transaction status management
- [ ] Buat transaction reports
- [ ] Implementasi export functionality

### 3.5 Payment Gateway Integration (Future-ready)
- [ ] Buat PaymentProcessor interface
- [ ] Implementasi base payment processor class
- [ ] Setup structure untuk Midtrans integration (placeholder)
- [ ] Setup structure untuk Xendit integration (placeholder)
- [ ] Buat payment processor factory

---

## 🔐 Phase 4: Security & Optimization

### 4.1 Advanced Security
- [ ] Implementasi comprehensive tenant isolation
- [ ] Setup rate limiting untuk semua public endpoints
- [ ] Implementasi CSRF protection
- [ ] Setup security headers di Next.js
- [ ] Implementasi input sanitization
- [ ] Buat security audit checklist

### 4.2 Data Protection
- [ ] Implementasi DTO untuk semua API responses
- [ ] Buat response scrubbing utilities
- [ ] Implementasi data masking untuk sensitive fields
- [ ] Setup audit logging untuk critical operations
- [ ] Implementasi data retention policies

### 4.3 Performance Optimization
- [ ] Implementasi database indexing
- [ ] Setup query optimization
- [ ] Implementasi caching strategy
- [ ] Optimize images dengan Next.js Image
- [ ] Setup CDN untuk static assets
- [ ] Implementasi lazy loading untuk components

### 4.4 Error Handling
- [ ] Buat global error boundary
- [ ] Implementasi error logging
- [ ] Buat user-friendly error messages
- [ ] Setup error monitoring (opsional: Sentry)

---

## 🧪 Phase 5: Testing & Quality Assurance

### 5.1 Unit Testing (Vitest)
- [ ] Test untuk repositories
- [ ] Test untuk services
- [ ] Test untuk utilities
- [ ] Test untuk DTOs
- [ ] Setup test coverage reporting

### 5.2 Component Testing
- [ ] Test untuk AdminLTE components
- [ ] Test untuk custom UI components
- [ ] Test untuk forms
- [ ] Test untuk data tables

### 5.3 Integration Testing
- [ ] Test untuk API routes
- [ ] Test untuk authentication flow
- [ ] Test untuk multi-tenancy isolation
- [ ] Test untuk database operations

### 5.4 E2E Testing (Playwright)
- [ ] Test untuk user authentication
- [ ] Test untuk order creation flow
- [ ] Test untuk payment upload flow
- [ ] Test untuk public tracking
- [ ] Test untuk admin operations
- [ ] Test untuk cross-browser compatibility

### 5.5 Security Testing
- [ ] Test untuk tenant isolation
- [ ] Test untuk authorization
- [ ] Test untuk input validation
- [ ] Test untuk rate limiting
- [ ] Penetration testing (opsional)

---

## 🚀 Phase 6: Deployment & Production

### 6.1 Vercel Deployment
- [ ] Setup Vercel project
- [ ] Konfigurasi environment variables
- [ ] Setup database connection
- [ ] Deploy staging environment
- [ ] Setup custom domain
- [ ] Configure SSL certificates

### 6.2 Database Migration
- [ ] Run production migrations
- [ ] Setup database backups
- [ ] Configure connection pooling
- [ ] Setup database monitoring

### 6.3 Monitoring & Analytics
- [ ] Setup error monitoring
- [ ] Setup performance monitoring
- [ ] Setup user analytics (opsional)
- [ ] Setup uptime monitoring

### 6.4 Documentation
- [ ] Buat API documentation
- [ ] Buat user manual
- [ ] Buat admin guide
- [ ] Update README.md
- [ ] Buat deployment guide

---

## 📊 Progress Tracking

### Current Status: Phase 0 - Foundation & Setup

**Completed:**
- ✅ Next.js 16.x LTS setup
- ✅ React 18.3.1 (konservatif)
- ✅ TypeScript configuration
- ✅ ESLint configuration

**In Progress:**
- ⏳ Dependencies installation
- ⏳ Database setup

**Next Steps:**
1. Install AdminLTE v4 dan dependencies
2. Setup Prisma dan database schema
3. Setup NextAuth.js v5
4. Setup testing framework

---

## 📝 Notes

- **WAJIB**: Baca dan ikuti `.cursorrules` sebelum coding
- Setiap task harus mengikuti prinsip SOLID
- Semua UI components harus menggunakan AdminLTE v4 styling
- Setiap API endpoint harus memiliki validasi Zod
- Setiap query database harus include outlet filtering (CRITICAL)
- Semua sensitive data harus di-scrub sebelum dikirim ke client
- Testing harus ditulis untuk setiap feature baru
- Gunakan DTO pattern untuk semua API responses
- Multi-tenancy security adalah prioritas utama

---

## 🔄 Review & Updates

Development plan ini akan diupdate secara berkala sesuai dengan progress dan perubahan requirement.

**Last Updated**: 2026-01-23  
**Version**: 1.0
