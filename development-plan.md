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
- [x] Install AdminLTE v4 (`admin-lte@4.0.0-rc4`)
- [x] Install Bootstrap 5
- [x] Install Prisma (`@prisma/client`, `prisma`)
- [x] Install NextAuth.js v5 (`next-auth`)
- [x] Install Zod untuk validasi (`zod`)
- [x] Install bcrypt untuk hashing PIN (`bcryptjs` dan `@types/bcryptjs`)
- [x] Install Fonnte SDK atau HTTP client untuk WhatsApp API (`axios` atau `node-fetch`)
- [x] Install Vitest dan dependencies (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`)
- [x] Install Playwright (`@playwright/test`)
- [x] Install FontAwesome icons
- [x] Install utility libraries (`date-fns`, `uuid`)

### 0.2 Database Setup
- [x] Setup Neon.tech PostgreSQL database (Singapore region)
- [x] Konfigurasi Prisma schema sesuai blueprint
  - [x] Enum: Role, OrderStatus, PaymentStatus, PaymentMethod (CASH, TRANSFER, MIDTRANS, XENDIT), TransType, OtpType (REGISTER)
  - [x] Model: User (dengan PIN, isPinSet, pinChangedAt), OtpCode, Outlet, BankAccount, PaymentGatewayConfig, Service, Order, Transaction
  - [x] Relasi antar model:
    - User → Outlet (many-to-one, optional)
    - Outlet → BankAccount (one-to-many)
    - Outlet → PaymentGatewayConfig (one-to-many)
    - Transaction → PaymentGatewayConfig (many-to-one, optional)
- [x] Generate Prisma Client
- [x] Setup Prisma migrations
- [x] Seed database dengan data awal (SuperAdmin user dengan PIN default)

### 0.3 Environment Configuration
- [x] Setup `.env.local` dari `.env.example`
- [x] Konfigurasi `DATABASE_URL`
- [x] Konfigurasi `NEXTAUTH_URL` dan `NEXTAUTH_SECRET`
- [x] Konfigurasi `FONNTE_API_KEY` untuk WhatsApp service
- [x] Konfigurasi `FONNTE_API_URL` (opsional, default dari Fonnte)
- [x] Konfigurasi Cloudinary/Supabase Storage (opsional)
- [x] Setup environment variables untuk Vercel (dokumentasi: `docs/VERCEL-ENV-SETUP.md`)

### 0.4 Testing Setup
- [x] Konfigurasi Vitest (`vitest.config.ts`)
- [x] Konfigurasi Playwright (`playwright.config.ts`)
- [x] Setup test utilities dan helpers (`__tests__/utils/`)
- [x] Setup test database (separate schema untuk testing, dokumentasi: `docs/TEST-SETUP.md`)
- [x] Tambahkan test scripts di `package.json`
- [x] Buat verification tests untuk cursor rules compliance (`__tests__/verify-cursor-rules.test.ts`)

### 0.5 Project Structure (SOLID Principles)
- [x] Buat struktur folder:
  ```
  src/
  ├── app/                    # Next.js App Router
  │   ├── api/               # API routes
  │   │   ├── auth/          # NextAuth routes
  │   │   ├── dashboard/     # Internal dashboard API
  │   │   └── public/        # Public API (tracking)
  │   ├── dashboard/         # Dashboard pages
  │   ├── admin/             # SuperAdmin pages
  │   ├── outlet/            # Public outlet pages
  │   └── track/             # Public tracking
  ├── components/             # Reusable UI components
  │   ├── adminlte/          # AdminLTE components
  │   └── ui/                # Custom UI components
  ├── lib/                   # Utilities & configs
  │   ├── prisma.ts         # Prisma client singleton
  │   ├── auth.ts           # NextAuth config
  │   ├── utils.ts           # Helper functions
  │   └── proxy/            # Route protection proxy
  │       └── route-proxy.ts # Proxy pattern for auth/authorization
  ├── repositories/         # Data access layer
  ├── services/             # Business logic layer
  ├── types/                # TypeScript types
  └── dto/                  # Data Transfer Objects
  ```

### 0.6 Cursor Rules Setup
- [x] Buat `.cursorrules` file dengan guidelines lengkap
- [x] Update `.cursorrules` untuk menggunakan proxy pattern (bukan middleware)
- [ ] Review dan pastikan semua developer memahami cursor rules
- [ ] Setup pre-commit hooks untuk code quality (opsional)

---

## 🏗️ Phase 1: AdminLTE Dashboard Setup & Multi-Tenancy

### 1.1 Authentication System

#### 1.1.1 Database Models untuk Authentication
- [x] Update User model dengan field PIN (hashed), isPinSet, pinChangedAt
- [x] Update OtpCode model (OTP hanya untuk REGISTER, bukan LOGIN)
- [x] Update OtpType enum (hanya REGISTER)
- [x] Run Prisma migrations

#### 1.1.2 WhatsApp Service Integration
- [x] Buat interface WhatsAppService (`src/services/whatsapp/interfaces/WhatsAppService.ts`)
  - [x] Method: `sendOtp(phone: string, code: string): Promise<boolean>`
  - [x] Method: `sendMessage(phone: string, message: string): Promise<boolean>`
- [x] Implementasi FonnteWhatsAppService (`src/services/whatsapp/providers/FonnteWhatsAppService.ts`)
  - [x] Integrasi dengan Fonnte API
  - [x] Handle API response dan error
  - [x] Template message untuk OTP
- [x] Buat WhatsAppServiceFactory (`src/services/whatsapp/WhatsAppServiceFactory.ts`)
- [x] Setup environment variables untuk Fonnte API key

#### 1.1.3 OTP Service
- [x] Buat OtpService (`src/services/auth/OtpService.ts`)
  - [x] Method: `generateOtp(phone: string, type: OtpType): Promise<string>`
  - [x] Method: `verifyOtp(phone: string, code: string, type: OtpType): Promise<boolean>`
  - [x] Method: `cleanupExpiredOtps()` (background job)
- [x] Implementasi rate limiting untuk OTP request (max 3 request per 10 menit per phone)
- [x] Buat API route untuk request OTP (`/api/auth/otp/request`)
- [x] Buat API route untuk verify OTP (`/api/auth/otp/verify`)

#### 1.1.4 Registration Flow (OWNER only)
- [x] Buat registration page (`app/register/page.tsx`) dengan modern design dan SweetAlert
- [x] Step 1: Input nomor WhatsApp
- [x] Step 2: Request OTP via WhatsApp (Fonnte API)
- [x] Step 3: Verify OTP
- [x] Step 4: Input data outlet (nama, alamat) dan set PIN (4-6 digit)
- [x] Buat API route untuk registration (`/api/auth/register`)
  - [x] Validasi: hanya OWNER yang boleh register
  - [x] Create User dengan role OWNER
  - [x] Create Outlet baru
  - [x] Hash PIN dengan bcrypt
  - [x] Redirect ke login setelah registrasi
- [x] Implementasi validation dengan Zod
- [x] Handle error cases (duplicate phone, invalid OTP, dll)
- [x] Phone number normalization (tanpa + prefix untuk storage)

#### 1.1.5 PIN-based Login
- [x] Setup NextAuth.js v5 dengan credentials provider
- [x] Buat login page (`app/login/page.tsx`) dengan modern design dan SweetAlert
  - [x] Input: nomor WhatsApp dan PIN
  - [x] Validasi format phone number
  - [x] Validasi PIN (4-6 digit)
- [x] Implementasi PIN verification (bcrypt comparison)
- [x] Buat API route untuk authentication (`/api/auth/[...nextauth]`)
  - [x] Credentials provider untuk PIN-based login
  - [x] Session include: userId, outletId, role, phone
  - [x] Update lastLoginAt setelah login berhasil
- [ ] Implementasi rate limiting untuk login attempts (max 5 attempts per 15 menit per phone)
- [x] Handle error cases (invalid credentials, inactive user, dll)
- [x] Phone number normalization untuk konsistensi

#### 1.1.6 Session Management
- [x] Setup session management dengan outletId
- [x] Implementasi role-based access (SUPERADMIN, OWNER, STAFF)
- [x] Buat session type definition untuk TypeScript
- [x] Buat utility functions untuk session helpers (`src/lib/session.ts`)
  - [x] `getSession()`, `getCurrentUser()`, `requireAuth()`, `requireRole()`
  - [x] `isSuperAdmin()`, `isOwner()`, `isStaff()`, `isOwnerOrSuperAdmin()`
  - [x] `getOutletId()`, `requireOutletId()`
- [ ] Implementasi middleware untuk route protection (menggunakan route proxy pattern)

#### 1.1.7 PIN Management
- [x] Buat halaman change PIN (`app/dashboard/settings/change-pin/page.tsx`)
- [x] Implementasi change PIN dengan validasi PIN lama
- [x] Update pinChangedAt setelah PIN diubah
- [x] Buat API route untuk change PIN (`/api/dashboard/settings/change-pin`)
- [x] Implementasi rate limiting untuk change PIN

#### 1.1.8 Security Features
- [x] Implementasi rate limiting untuk semua auth endpoints
- [x] Implementasi account lockout setelah multiple failed attempts
- [x] Logging untuk security events (login attempts, OTP requests, dll)
- [x] Implementasi CSRF protection (NextAuth v5 built-in)
- [x] Setup secure session cookies

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
- [ ] Implementasi BankAccount model (multiple rekening per outlet)
- [ ] Implementasi PaymentGatewayConfig model (konfigurasi gateway per outlet)
- [ ] Implementasi Service model (untuk layanan laundry)
- [ ] Implementasi Order model lengkap dengan relasi (include paymentMethod)
- [ ] Implementasi Transaction model lengkap (include paymentMethod, bankAccountId, paymentGatewayConfigId, gatewayTransactionId, gatewayResponse, webhookData)
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

### 1.6.1 Bank Account Management (Owner)
- [ ] Buat halaman bank account management (`app/dashboard/settings/bank-accounts/page.tsx`)
- [ ] Implementasi CRUD untuk bank accounts per outlet
- [ ] Buat form add/edit bank account dengan AdminLTE styling
- [ ] Implementasi bank account activation/deactivation
- [ ] Buat bank account selection untuk display di public outlet page
- [ ] Implementasi validation untuk bank account data

### 1.6.2 Payment Gateway Configuration (Owner)
- [ ] Buat halaman payment gateway settings (`app/dashboard/settings/payment-gateways/page.tsx`)
- [ ] Display list available payment gateways (Midtrans, Xendit)
- [ ] Implementasi enable/disable gateway per outlet
- [ ] Buat form konfigurasi untuk setiap gateway type
- [ ] Implementasi secure storage untuk API keys (encryption)
- [ ] Buat test connection untuk gateway configuration
- [ ] Display gateway status (active/inactive, last verified)
- [ ] Implementasi validation untuk gateway credentials

### 1.7 Outlet Microsite (Public)
- [ ] Buat dynamic route `/outlet/[slug]`
- [ ] Buat halaman publik outlet dengan desain minimalis
- [ ] Display outlet information (nama, alamat, kontak)
- [ ] Display services yang tersedia
- [ ] Display bank accounts untuk transfer (hanya yang aktif)
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
- [ ] Implementasi payment method selection:
  - [ ] CASH (langsung set paymentStatus = SETTLEMENT)
  - [ ] TRANSFER (set paymentStatus = PENDING, require proof upload)
  - [ ] MIDTRANS (redirect ke Midtrans payment page, set paymentStatus = PENDING)
  - [ ] XENDIT (redirect ke Xendit payment page, set paymentStatus = PENDING)
- [ ] Implementasi cash payment handling (langsung set paymentStatus = SETTLEMENT)
- [ ] Implementasi transfer payment handling (set paymentStatus = PENDING, require proof upload)
- [ ] Implementasi payment gateway flow (create payment, redirect, handle callback)
- [ ] Implementasi order status workflow
- [ ] Buat order list page dengan datatable
- [ ] Implementasi filter dan search orders
- [ ] Display payment method dan gateway info di order list

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
- [ ] Implementasi file upload untuk bukti transfer (hanya untuk paymentMethod = TRANSFER)
- [ ] Integrasi dengan Cloudinary/Supabase Storage
- [ ] Buat form upload dengan AdminLTE styling
- [ ] Display bank account options untuk transfer
- [ ] Implementasi image preview
- [ ] Buat payment status display
- [ ] Implementasi validation untuk upload
- [ ] Handle cash payment (tidak perlu upload bukti, langsung verified di POS)

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
- [ ] Implementasi filter by payment method (CASH, TRANSFER, MIDTRANS, XENDIT)
- [ ] Buat transaction detail page
- [ ] Implementasi transaction status management
- [ ] Display bank account info untuk transfer transactions
- [ ] Display payment gateway info untuk gateway transactions (gateway type, transaction ID, response data)
- [ ] Buat transaction reports dengan breakdown per payment method
- [ ] Implementasi export functionality
- [ ] Display webhook data untuk debugging (admin only)

### 3.5 Payment Gateway Integration (Future-ready)

#### 3.5.1 Payment Gateway Architecture
- [ ] Buat PaymentProcessor interface (`src/services/payment/interfaces/PaymentProcessor.ts`)
  - [ ] Method: `createPayment(amount, orderId, metadata)`
  - [ ] Method: `verifyPayment(transactionId)`
  - [ ] Method: `handleWebhook(payload, signature)`
  - [ ] Method: `getPaymentStatus(transactionId)`
- [ ] Implementasi base payment processor abstract class
- [ ] Buat payment processor factory (`src/services/payment/PaymentProcessorFactory.ts`)
- [ ] Buat payment service untuk orchestration (`src/services/payment/PaymentService.ts`)

#### 3.5.2 Payment Gateway Configuration Management
- [ ] Buat halaman payment gateway settings (`app/dashboard/settings/payment-gateways/page.tsx`)
- [ ] Implementasi CRUD untuk payment gateway config per outlet
- [ ] Buat form untuk konfigurasi Midtrans (API key, merchant ID, dll)
- [ ] Buat form untuk konfigurasi Xendit (API key, secret, dll)
- [ ] Implementasi encryption untuk API keys dan secrets (gunakan environment encryption)
- [ ] Implementasi enable/disable gateway per outlet
- [ ] Buat validation untuk gateway configuration

#### 3.5.3 Midtrans Integration
- [ ] Install Midtrans SDK (`midtrans-client`)
- [ ] Buat MidtransPaymentProcessor class yang implement PaymentProcessor
- [ ] Implementasi createPayment untuk Midtrans (Snap/API)
- [ ] Implementasi webhook handler untuk Midtrans
- [ ] Implementasi payment verification
- [ ] Buat API route untuk Midtrans webhook (`/api/webhooks/midtrans`)
- [ ] Implementasi error handling dan retry logic
- [ ] Buat test untuk Midtrans integration

#### 3.5.4 Xendit Integration
- [ ] Install Xendit SDK (`xendit-node`)
- [ ] Buat XenditPaymentProcessor class yang implement PaymentProcessor
- [ ] Implementasi createPayment untuk Xendit (Virtual Account/EWallet)
- [ ] Implementasi webhook handler untuk Xendit
- [ ] Implementasi payment verification
- [ ] Buat API route untuk Xendit webhook (`/api/webhooks/xendit`)
- [ ] Implementasi error handling dan retry logic
- [ ] Buat test untuk Xendit integration

#### 3.5.5 Payment Gateway UI Integration
- [ ] Update order creation form untuk include payment gateway options
- [ ] Buat payment selection component (CASH, TRANSFER, MIDTRANS, XENDIT)
- [ ] Implementasi payment gateway redirect flow (untuk Midtrans Snap)
- [ ] Buat payment status page setelah redirect dari gateway
- [ ] Implementasi real-time payment status update (polling atau websocket)
- [ ] Buat payment gateway selection di public tracking page (jika diperlukan)

#### 3.5.6 Webhook Security & Verification
- [ ] Implementasi webhook signature verification untuk Midtrans
- [ ] Implementasi webhook signature verification untuk Xendit
- [ ] Buat webhook handler service dengan rate limiting
- [ ] Implementasi idempotency untuk webhook processing
- [ ] Buat webhook logging dan audit trail
- [ ] Implementasi webhook retry mechanism

#### 3.5.7 Payment Gateway Testing
- [ ] Buat unit test untuk PaymentProcessor interface
- [ ] Buat integration test untuk Midtrans (menggunakan sandbox)
- [ ] Buat integration test untuk Xendit (menggunakan sandbox)
- [ ] Buat E2E test untuk payment flow dengan gateway
- [ ] Test webhook handling dengan mock payloads

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

### Current Status: Phase 1 - Authentication System (In Progress)

**Completed:**
- ✅ Phase 0: Foundation & Setup
  - ✅ Next.js 16.x LTS setup
  - ✅ React 18.3.1
  - ✅ TypeScript configuration
  - ✅ ESLint configuration
  - ✅ Dependencies installation
  - ✅ Database setup dengan Prisma
  - ✅ NextAuth.js v5 configuration
  - ✅ Testing framework setup

- ✅ Phase 1.1.1: Database Models untuk Authentication
- ✅ Phase 1.1.2: WhatsApp Service Integration (Fonnte)
- ✅ Phase 1.1.3: OTP Service dengan rate limiting
- ✅ Phase 1.1.4: Registration Flow (OWNER only) dengan modern UI
- ✅ Phase 1.1.5: PIN-based Login dengan modern UI dan SweetAlert
- ✅ Phase 1.1.6: Session Management utilities
- ✅ Phase 1.1.7: PIN Management
- ✅ Phase 1.1.8: Security Features (rate limiting, account lockout, logging, CSRF, secure cookies)

**In Progress:**
- ⏳ Phase 1.2: AdminLTE Layout Integration

**Next Steps:**
1. AdminLTE Layout Integration
2. Multi-Tenancy Foundation
3. Complete Database Models

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

### Recent Improvements (2026-01-23)
- ✅ Modern UI design untuk login dan registration pages dengan gradient background
- ✅ SweetAlert2 integration untuk better user experience
- ✅ Phone number normalization (tanpa + prefix untuk database storage)
- ✅ Improved error handling dan logging untuk OTP verification
- ✅ Multi-step registration flow dengan progress indicator

---

## 🔄 Review & Updates

Development plan ini akan diupdate secara berkala sesuai dengan progress dan perubahan requirement.

**Last Updated**: 2026-01-23  
**Version**: 1.1

### Changelog
- **v1.1 (2026-01-23)**: Completed Phase 1.1.1 - 1.1.6 (Authentication System foundation)
- **v1.0 (2026-01-23)**: Initial development plan
