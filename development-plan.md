# 📋 Development Plan: Laundry SaaS Platform

This document is a detailed development plan to build the Laundry SaaS system based on the architecture blueprint.

> **Note**: Please read `.cursorrules` for coding guidelines, security rules, and best practices before starting development.

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

## 🔐 Role Model & Access (RBAC)

The main goal of the role model is to keep **multi-tenancy** secure and clearly separate the **SaaS platform** area vs the **outlet operations** area.

### Core Principles
- **Outlet context (multi-tenancy)**: outlet endpoints/features **must** use `outletId` from the session (not from request/client).
- **Multi-outlet note (OWNER)**: `session.outletId` represents the **active outlet** currently selected by the user, not the “only outlet” owned by the OWNER.
- **Application area separation**:
  - **Admin Panel (platform)**: `/admin/*` and `/api/admin/*` → **SUPERADMIN**
  - **Outlet Dashboard (tenant)**: `/dashboard/*` and `/api/dashboard/*` → **OWNER/STAFF** (**requires** `outletId`)
  - **Public**: `/track/*`, `/outlet/*`, `/api/public/*` → public (no auth, with rate limiting when needed)

### Role Definitions
- **SUPERADMIN (SaaS Admin)**:
  - Focus: manage the SaaS system (outlets, platform users, subscriptions, payment verification, audit).
  - Access: **only** `/admin/*` (does not run outlet operations).
  - Outlet context: typically has **no** `outletId`, therefore **does not** access `/dashboard/*`.
- **OWNER (Tenant Admin)**:
  - Focus: outlet owner; manages outlet configuration and operations.
  - Access: `/dashboard/*` (including sensitive settings like bank accounts, payment configuration, services, reports).
  - Tenant-level user management: **can** manage **STAFF** accounts for their own outlet.
- **STAFF (Tenant Operator)**:
  - Focus: day-to-day outlet operations (POS, order workflow, customers).
  - Access: `/dashboard/*` with limitations (e.g., cannot change sensitive configuration).
  - Note: detailed permissions are mapped per feature (see tasks under POS/Orders/Settings).

### Backlog: Impersonation (Support)
- (Optional) For troubleshooting/support: SUPERADMIN can **impersonate** OWNER/STAFF via the admin panel.
  This is not daily SUPERADMIN access to the outlet dashboard, and must be strictly audited/logged.

---

## 🧭 System Rules (Source of Truth)

This section contains **system/product rules**. All implementations (API/UI) must follow these rules.

- **RBAC & access areas**:
  - SUPERADMIN → Admin Panel (`/admin/*`)
  - OWNER/STAFF → Outlet Dashboard (`/dashboard/*`)
- **Outlet context**:
  - `session.outletId` = the **active outlet** selected by the user (OWNER can be multi-outlet; roadmap)
  - `session.outletId` can be `null` for SUPERADMIN
- **Payment scope**:
  - **SaaS subscription**: manual transfer + proof upload by OWNER + verification/approval by SUPERADMIN
  - **Outlet transactions (LAUNDRY_ORDER)**: **bookkeeping only** (PAID/UNPAID + optional `paidAt`), no payment approval
- **Outlet Landing Page**:
  - Public (`/outlet/[slug]`) and follows the **no overclaim** principle
  - Landing page content is configurable by OWNER per outlet (roadmap)

---

## 🏷️ Role Tags for Tasks

To make the roadmap clearer, each section/task uses role tags:

- `[Role: SYSTEM]` → internal engineering work (security, infra, repo/service, testing)
- `[Role: SUPERADMIN]` → Admin Panel features (SaaS platform)
- `[Role: OWNER]` → Outlet Dashboard features for outlet owners
- `[Role: STAFF]` → Outlet Dashboard features for operators
- `[Role: OWNER/STAFF]` → Outlet Dashboard features accessible by both
- `[Role: PUBLIC]` → public features (customer/public) without login

Role reference (high-level features): `docs/roles/`

---

## ✅ Implemented (Done)

## 📦 Phase 0: Foundation & Setup

### 0.1 Dependencies Installation [Role: SYSTEM]
- [x] Install AdminLTE v4 (`admin-lte@4.0.0-rc4`)
- [x] Install Bootstrap 5
- [x] Install Prisma (`@prisma/client`, `prisma`)
- [x] Install NextAuth.js v5 (`next-auth`)
- [x] Install Zod for validation (`zod`)
- [x] Install bcrypt for PIN hashing (`bcryptjs` and `@types/bcryptjs`)
- [x] Install Fonnte SDK or an HTTP client for WhatsApp API (`axios` or `node-fetch`)
- [x] Install Vitest and dependencies (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`)
- [x] Install Playwright (`@playwright/test`)
- [x] Install FontAwesome icons
- [x] Install utility libraries (`date-fns`, `uuid`)

### 0.2 Database Setup [Role: SYSTEM]
- [x] Setup Neon.tech PostgreSQL database (Singapore region)
- [x] Configure Prisma schema according to the blueprint
  - [x] Enum: Role, OrderStatus, PaymentStatus, PaymentMethod (CASH, TRANSFER, MIDTRANS, XENDIT), TransType, OtpType (REGISTER)
  - [x] Models: User (with PIN, isPinSet, pinChangedAt), OtpCode, Outlet, BankAccount, PaymentGatewayConfig, Service, Order, Transaction
  - [x] Model relationships:
    - User → Outlet (many-to-one, optional)
    - Outlet → BankAccount (one-to-many)
    - Outlet → PaymentGatewayConfig (one-to-many)
    - Transaction → PaymentGatewayConfig (many-to-one, optional)
- [x] Generate Prisma Client
- [x] Setup Prisma migrations
- [x] Seed database with initial data (SuperAdmin user with default PIN)

### 0.3 Environment Configuration [Role: SYSTEM]
- [x] Create `.env.local` from `.env.example`
- [x] Configure `DATABASE_URL`
- [x] Configure `NEXTAUTH_URL` and `NEXTAUTH_SECRET`
- [x] Configure `FONNTE_API_KEY` for WhatsApp service
- [x] Configure `FONNTE_API_URL` (optional, default from Fonnte)
- [x] Configure Cloudinary/Supabase Storage (optional)
- [x] Set up environment variables for Vercel (docs: `docs/VERCEL-ENV-SETUP.md`)

### 0.4 Testing Setup [Role: SYSTEM]
- [x] Configure Vitest (`vitest.config.ts`)
- [x] Configure Playwright (`playwright.config.ts`)
- [x] Set up test utilities and helpers (`__tests__/utils/`)
- [x] Set up test database (separate schema for testing, docs: `docs/TEST-SETUP.md`)
- [x] Add test scripts to `package.json`
- [x] Create verification tests for Cursor rules compliance (`__tests__/verify-cursor-rules.test.ts`)

### 0.5 Project Structure (SOLID Principles) [Role: SYSTEM]
- [x] Create folder structure:
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
### 0.6 Cursor Rules Setup [Role: SYSTEM]
- [x] Create `.cursorrules` with complete guidelines
- [x] Update `.cursorrules` to use the proxy pattern (not middleware)

---

## 🏗️ Phase 1: AdminLTE Dashboard Setup & Multi-Tenancy

### 1.1 Authentication System [Role: SYSTEM]

#### 1.1.1 Database Models for Authentication
- [x] Update User model with PIN fields (hashed), isPinSet, pinChangedAt
- [x] Update OtpCode model (OTP only for REGISTER, not LOGIN)
- [x] Update OtpType enum (REGISTER only)
- [x] Run Prisma migrations

#### 1.1.2 WhatsApp Service Integration
- [x] Create WhatsAppService interface (`src/services/whatsapp/interfaces/WhatsAppService.ts`)
- [x] Method: `sendOtp(phone: string, code: string): Promise<boolean>`
- [x] Method: `sendMessage(phone: string, message: string): Promise<boolean>`
- [x] Implement FonnteWhatsAppService (`src/services/whatsapp/providers/FonnteWhatsAppService.ts`)
- [x] Integrate with Fonnte API
- [x] Handle API response and errors
- [x] OTP message template
- [x] Create WhatsAppServiceFactory (`src/services/whatsapp/WhatsAppServiceFactory.ts`)
- [x] Set up environment variables for the Fonnte API key

#### 1.1.3 OTP Service
- [x] Create OtpService (`src/services/auth/OtpService.ts`)
- [x] Method: `generateOtp(phone: string, type: OtpType): Promise<string>`
- [x] Method: `verifyOtp(phone: string, code: string, type: OtpType): Promise<boolean>`
- [x] Method: `cleanupExpiredOtps()` (background job)
- [x] Implement rate limiting for OTP requests (max 3 requests per 10 minutes per phone)
- [x] Create API route for OTP request (`/api/auth/otp/request`)
- [x] Create API route for OTP verification (`/api/auth/otp/verify`)

#### 1.1.4 Registration Flow (OWNER only)
- [x] Create registration page (`app/register/page.tsx`) with a modern design and SweetAlert
- [x] Step 1: Input WhatsApp number
- [x] Step 2: Request OTP via WhatsApp (Fonnte API)
- [x] Step 3: Verify OTP
- [x] Step 4: Input outlet data (name, address) and set a PIN (4-6 digits)
- [x] Create API route for registration (`/api/auth/register`)
- [x] Validation: only OWNER can register
- [x] Create User with OWNER role
- [x] Create a new Outlet
- [x] Hash PIN with bcrypt
- [x] Redirect to login after registration
- [x] Implement validation with Zod
- [x] Handle error cases (duplicate phone, invalid OTP, etc.)
- [x] Phone number normalization (store without + prefix)

#### 1.1.5 PIN-based Login
- [x] Set up NextAuth.js v5 with credentials provider
- [x] Create login page (`app/login/page.tsx`) with a modern design and SweetAlert
- [x] Input: WhatsApp number and PIN
- [x] Validate phone number format
- [x] Validate PIN (4-6 digits)
- [x] Implement PIN verification (bcrypt comparison)
- [x] Create API route for authentication (`/api/auth/[...nextauth]`)
- [x] Credentials provider for PIN-based login
- [x] Session include: userId, outletId (nullable for SUPERADMIN), role, phone
- [x] Update lastLoginAt after successful login
- [x] Implement rate limiting for login attempts (max 5 attempts per 15 minutes per phone)
- [x] Handle error cases (invalid credentials, inactive user, etc.)
- [x] Phone number normalization for consistency

#### 1.1.6 Session Management
- [x] Set up session management with outletId (nullable for SUPERADMIN)
- [x] Implement role-based access (SUPERADMIN, OWNER, STAFF)
- [x] Create session type definitions for TypeScript
- [x] Create utility functions for session helpers (`src/lib/session.ts`)
- [x] `getSession()`, `getCurrentUser()`, `requireAuth()`, `requireRole()`
- [x] `isSuperAdmin()`, `isOwner()`, `isStaff()`, `isOwnerOrSuperAdmin()`
- [x] `getOutletId()`, `requireOutletId()`
- [x] Implement route protection (using the route proxy pattern)

#### 1.1.7 PIN Management
- [x] Create change PIN page (`app/dashboard/settings/change-pin/page.tsx`)
- [x] Implement change PIN with old PIN validation
- [x] Update pinChangedAt after PIN change
- [x] Create API route for change PIN (`/api/dashboard/settings/change-pin`)
- [x] Implement rate limiting for change PIN

#### 1.1.8 Security Features
- [x] Implement rate limiting for all auth endpoints
- [x] Implement account lockout after multiple failed attempts
- [x] Log security events (login attempts, OTP requests, etc.)
- [x] Implement CSRF protection (NextAuth v5 built-in)
- [x] Setup secure session cookies

### 1.2 AdminLTE Layout Integration [Role: SYSTEM]
- [x] Install and import AdminLTE CSS/JS
- [x] Create dashboard layout component (`components/adminlte/DashboardLayout.tsx`)
- [x] Implement Sidebar Navigation with role-based menu
- [x] Implement Navbar with user info
- [x] Implement Footer
- [x] Setup responsive design (mobile sidebar toggle)
- [x] Integrate FontAwesome icons
- [x] Create AdminLTEProvider to load JS files from local assets (not CDN)
- [x] Create script to copy AdminLTE assets to the public folder

### 1.3 Multi-Tenancy Foundation [Role: SYSTEM]
- [x] Implement tenant isolation (via route proxy pattern)
- [x] Implement outlet context/provider (via session utilities)
- [x] Create utility function for outlet filtering (`src/lib/outlet.ts`)
- [x] Set up repository pattern for data access
- [x] Implement base repository with outlet filtering (`BaseRepository`)
- [x] Create service layer for business logic (`BaseService`)
- [x] Implement OutletRepository and ServiceRepository with outlet filtering
- [x] Implement ServiceService with role-based access control

### 1.4 Security Implementation Review & Completion [Role: SYSTEM]
- [x] Implement tenant isolation across all queries (via BaseRepository)
- [x] Create DTOs for response scrubbing (OutletDTO exists; extend for others)
- [x] Implement outlet verification (via route proxy pattern)
- [x] Set up rate limiting for auth endpoints (OTP, login, change PIN)
- [x] Implement Zod validation for forms (registration, login, change PIN)
- [x] Review and audit all API endpoints to ensure tenant isolation (docs: `docs/SECURITY-AUDIT.md`)
- [x] Extend DTO pattern to all API responses (OrderDTO, TransactionDTO, ServiceDTO created)
- [x] Implement comprehensive input sanitization (`src/lib/utils/sanitize.ts`)
- [x] Set up security headers in Next.js config (X-Frame-Options, CSP, HSTS, etc.)

### 1.5 Database Models (Complete Schema) [Role: SYSTEM]
- [x] Implement full User model
- [x] Implement full Outlet model
- [x] Implement BankAccount model (multiple accounts per outlet)
- [x] Implement PaymentGatewayConfig model (gateway configuration per outlet)
- [x] Implement Service model (laundry services)
- [x] Implement full Order model with relations (include paymentMethod)
- [x] Implement full Transaction model (include paymentMethod, bankAccountId, paymentGatewayConfigId, gatewayTransactionId, gatewayResponse, webhookData)
- [x] Setup all relationships between models
- [x] Run Prisma migrations

### 1.6 Dashboard Homepage [Role: OWNER/STAFF]
- [x] Create dashboard page (`app/dashboard/page.tsx`)
- [x] Implement Cards & Widgets (AdminLTE Info Box)
- [x] Today’s orders
- [x] Today’s revenue
- [x] Pending laundry
- [x] Total customers
- [x] Create chart/graph for statistics (optional)
- [x] Implement recent orders table
- [x] Setup role-based dashboard content

### 1.7 Outlet Management (SuperAdmin) [Role: SUPERADMIN]
- [x] Create outlet list page (`app/admin/outlets/page.tsx`)
- [x] Implement CRUD for outlets
- [x] Create create/edit outlet form with AdminLTE styling
- [x] Implement outlet slug generation
- [x] Create outlet detail page
- [x] Implement outlet status management

### 1.8 Bank Account Management (Owner) [Role: OWNER]
- [x] Create bank account management page (`app/dashboard/settings/bank-accounts/page.tsx`)
- [x] Implement CRUD for bank accounts per outlet
- [x] Create add/edit bank account form with AdminLTE styling
- [x] Implement bank account activation/deactivation
- [x] Implement validation for bank account data

### 1.10 User Management (SuperAdmin - Platform) [Role: SUPERADMIN]
- [x] Create user management page (`app/admin/users/page.tsx`)
- [x] Implement user list + filters:
- [x] Filter by role (SUPERADMIN, OWNER, STAFF)
- [x] Filter by outlet (for OWNER/STAFF)
- [x] Filter by status (active/inactive)
- [x] Search by name/phone number
- [x] Pagination (page/limit)
- [x] Implement CRUD for users (SuperAdmin) for SaaS platform needs:
- [x] Create user (OWNER/SUPERADMIN) + assign outlet (for OWNER)
- [x] Update user (name, role, outlet assignment, phone, active status)
- [x] Activate/Deactivate user
- [x] Implement role assignment with strict guards (SUPERADMIN only)
- [x] Implement admin actions:
- [x] Reset user PIN (generate new PIN, set `pinChangedAt`, reset lockout, best-effort WhatsApp send)
- [x] Create user detail page (`app/admin/users/[id]/page.tsx`)
- [x] Audit logging for admin operations (via `SecurityLogService`):
- [x] ADMIN_USER_CREATE, ADMIN_USER_UPDATE, ADMIN_USER_ACTIVATE/DEACTIVATE, ADMIN_USER_RESET_PIN
- [x] API routes (SuperAdmin only):
- [x] `GET/POST /api/admin/users`
- [x] `GET/PUT /api/admin/users/[id]`
- [x] `POST /api/admin/users/[id]/reset-pin`

> Note: **STAFF** accounts should ideally be managed by **OWNER** (tenant-level). SuperAdmin may still do cross-outlet monitoring and emergency actions (e.g., reset PIN / deactivate) when needed.

---

## 🚧 Roadmap (Priorities)

Priority order: **Multi-outlet OWNER → Landing Page + Settings → Staff Management → POS → Payment Verification/Subscription → the rest**.

### Priority 1: OWNER Multi-Outlet (Foundation) [Role: SYSTEM/OWNER]
- [x] (Roadmap) Change the outlet ownership model:
- [x] Add `Outlet.ownerId` (1 OWNER can have multiple outlets)
- [x] Add relation `User.ownedOutlets` (read-only via Prisma relation)
- [x] Evaluate migration from the old design `User.outletId` (for OWNER) → `Outlet.ownerId`
- [x] STAFF stays single-outlet: `User.outletId` is required for STAFF
- [x] (Roadmap) Outlet context for OWNER:
- [x] Add an “outlet switcher” in the dashboard (OWNER selects the active outlet)
- [x] `session.outletId` = active outlet (selected) for all tenant queries
- [x] (Roadmap) Security rules:
- [x] Server-side validation: active outlet must be one of the outlets owned by the OWNER
- [x] Do not accept `outletId` from the client as the source of truth (always from session)

### Priority 2: Outlet Landing Page + Settings [Role: PUBLIC/OWNER]
- [x] Create a public **Outlet Landing Page** per outlet (`/outlet/[slug]`) [Role: PUBLIC]
- [x] **No overclaim** principle (REQUIRED) [Role: PUBLIC]
- [x] Only show data that actually exists (name, address, description, etc.)
- [x] If data is missing, show a neutral empty state (no feature claims)
- [x] Content shown (conditional) [Role: PUBLIC]
- [x] Outlet info (name, address, description)
- [x] Services **if available**
- [x] Active bank accounts **if available** (for transfer info) — tidak ditampilkan (rekening bank hanya untuk pembukuan)
- [x] Per-outlet SEO metadata (title/description) [Role: PUBLIC]
- [x] Simple CTA (optional): WhatsApp/contact button (no complex order flow) [Role: PUBLIC]
- [x] OWNER can configure landing page content per outlet [Role: OWNER]
- [x] Outlet description
- [x] Contact/WhatsApp (optional)
- [x] Business hours (optional)
- [x] (Optional) Photo/cover/logo
- [x] Bank account selection for landing page display (active accounts only) [Role: OWNER] — tidak diperlukan (rekening bank hanya untuk pembukuan)
- [x] (Roadmap) Data model for landing page content storage [Role: SYSTEM]
- [x] Option A: fields on `Outlet` (e.g., `description`, `contactPhone`, `businessHours`, `coverUrl`)
- [ ] Option B: separate table `OutletLandingPage` (more flexible)

### Priority 3: Staff Management (Owner - Tenant) [Role: OWNER]
- [ ] Create staff management page for OWNER (recommended under settings): `app/dashboard/settings/staff/page.tsx`
- [ ] Implement staff list per outlet (session outlet only)
- [ ] Implement create/update/deactivate staff (OWNER only)
- [ ] Create STAFF (mandatory `outletId` = outlet session)
- [ ] Update STAFF (name, phone, active status; role remains STAFF)
- [ ] Deactivate STAFF (optional: cannot self-deactivate while logged in)
- [ ] Implement strict guards & validation:
- [ ] STAFF cannot be created/updated into OWNER/SUPERADMIN from the dashboard
- [ ] Must not manage users across outlets (tenant isolation)
- [ ] API routes (OWNER only, outlet scope):
- [ ] `GET/POST /api/dashboard/settings/staff`
- [ ] `GET/PUT /api/dashboard/settings/staff/[id]`

### Priority 4: POS (Owner/Staff) [Role: OWNER/STAFF]
(Implementation details are in Phase 2 below.)

### Priority 5: Admin SaaS (SuperAdmin) [Role: SUPERADMIN]
- [ ] Payment Verification (B2B) (see Phase 3.2)
- [ ] Subscription Management (see Phase 3.3)
- [ ] (Optional) Force logout / revoke session (admin action)

### Priority 6: Housekeeping (System) [Role: SYSTEM]
- [ ] Review and ensure all developers understand the Cursor rules
- [ ] Set up pre-commit hooks for code quality (optional)

---

## 🛒 Phase 2: POS with AdminLTE UI

### 2.1 Service Management [Role: OWNER]
- [ ] Create service management page (`app/dashboard/services/page.tsx`)
- [ ] Implement CRUD for services per outlet
- [ ] Create service form with AdminLTE styling
- [ ] Implement service categories (Kilo, Unit, Package)
- [ ] Implement pricing management
- [ ] Create datatable with Bootstrap DataTables

### 2.2 Order Management (POS) [Role: OWNER/STAFF]
- [ ] Create POS page (`app/dashboard/orders/new/page.tsx`)
- [ ] Implement order creation form
- [ ] Create service selection interface
- [ ] Implement quantity & price calculation
- [ ] Create order summary component
- [ ] Order payment is **bookkeeping only** (no paymentMethod, no proof upload, no approval):
- [ ] Simple status: **PAID / UNPAID**
- [ ] Timestamp `paidAt` (optional) + internal note (optional)
- [ ] Implement order status workflow
- [ ] Create order list page with datatable
- [ ] Implement order filters and search
- [ ] (Optional) Display simple payment status (PAID/UNPAID) in the order list

### 2.3 Order Workflow Visualization [Role: OWNER/STAFF]
- [ ] Create order detail page (`app/dashboard/orders/[id]/page.tsx`)
- [ ] Implement AdminLTE Steps/Timeline for workflow
- [ ] Status visualization: QUEUED → WASHING → DRYING → IRONING → READY → TAKEN
- [ ] Implement status update buttons
- [ ] Create history log for status changes
- [ ] Implement real-time status updates (optional)

### 2.4 Order Tracking (Public) [Role: PUBLIC]
- [ ] Create public tracking page (`app/track/[code]/page.tsx`)
- [ ] Implement tracking code lookup
- [ ] Display minimal order information (privacy-focused)
- [ ] Implement status visualization for public
- [ ] Create form for tracking code input
- [ ] Implement rate limiting for the tracking page

### 2.5 Digital Invoice/Receipt [Role: OWNER/STAFF]
- [ ] Create invoice page (`app/dashboard/orders/[id]/invoice/page.tsx`)
- [ ] Implement invoice template with AdminLTE styling
- [ ] Display order details, customer info, services
- [ ] Implement print functionality
- [ ] Create share to WhatsApp functionality
- [ ] Implement PDF download (optional)

### 2.6 Customer Management [Role: OWNER/STAFF]
- [ ] Create Customer model in Prisma
- [ ] Create customer list page (`app/dashboard/customers/page.tsx`)
- [ ] Implement CRUD for customers
- [ ] Create customer detail page with order history
- [ ] Implement customer search
- [ ] Create quick customer selection in POS

### 2.7 Order Reports [Role: OWNER]
- [ ] Create reports page (`app/dashboard/reports/page.tsx`)
- [ ] Implement daily/weekly/monthly reports
- [ ] Create chart for order statistics
- [ ] Implement export to Excel/PDF (optional)
- [ ] Create date range filter

---

## 💳 Phase 3: Manual Payment System & Admin Panel

> Scope note: **Payment methods + approval/verification are only for SaaS subscriptions**. Outlet transactions (laundry orders) are **bookkeeping only**.

### 3.2 Payment Verification (Subscription - SuperAdmin) [Role: SUPERADMIN]
- [ ] Create payment verification page (`app/admin/payments/page.tsx`)
- [ ] Implement list of pending payments (subscription only)
- [ ] Create AdminLTE Info Box for payment status
- [ ] Implement approve/reject for subscription payments
- [ ] Create payment detail modal
- [ ] Implement payment history
- [ ] Create notification system for payment status

### 3.3 Subscription Management [Role: SUPERADMIN]
- [ ] Create subscription management page (`app/admin/subscriptions/page.tsx`)
- [ ] Implement subscription status per outlet
- [ ] Create subscription renewal interface
- [ ] Implement subscription expiry tracking
- [ ] Create subscription payment verification
- [ ] Implement auto-disable features for expired subscriptions

### 3.1 Subscription Payment Proof Upload (Owner) [Role: OWNER]
- [ ] Create subscription payment proof upload page (authenticated) (e.g., `settings/subscription`)
- [ ] Implement transfer proof file upload (subscription only)
- [ ] Integrate storage (Cloudinary/Supabase Storage)
- [ ] Implement upload validation
- [ ] Show “pending verification” status after submit

### 3.4 Transaction Management [Role: OWNER]
- [ ] Create transaction list page (`app/dashboard/transactions/page.tsx`)
- [ ] Implement filter by type (SUBSCRIPTION, LAUNDRY_ORDER)
- [ ] Create transaction detail page
- [ ] Implement transaction status management
- [ ] Outlet transactions (LAUNDRY_ORDER) are **bookkeeping only** (no approval/verification, no paymentMethod)
- [ ] (Optional) Create transaction reports for internal bookkeeping (daily/monthly, etc.)
- [ ] Implement export functionality
- [ ] Display webhook data for debugging (Admin Panel) [Role: SUPERADMIN]

### 3.5 Payment Gateway Integration (Future-ready) [Role: SYSTEM]

#### 3.5.1 Payment Gateway Architecture [Role: SYSTEM]
- [ ] Create PaymentProcessor interface (`src/services/payment/interfaces/PaymentProcessor.ts`)
- [ ] Method: `createPayment(amount, orderId, metadata)`
- [ ] Method: `verifyPayment(transactionId)`
- [ ] Method: `handleWebhook(payload, signature)`
- [ ] Method: `getPaymentStatus(transactionId)`
- [ ] Implement base payment processor abstract class
- [ ] Create payment processor factory (`src/services/payment/PaymentProcessorFactory.ts`)
- [ ] Create payment service for orchestration (`src/services/payment/PaymentService.ts`)

#### 3.5.2 Payment Gateway Configuration Management [Role: OWNER]
- [ ] Create payment gateway settings page (`app/dashboard/settings/payment-gateways/page.tsx`)
- [ ] Implement CRUD for payment gateway config per outlet
- [ ] Create form for Midtrans configuration (API key, merchant ID, etc.)
- [ ] Create form for Xendit configuration (API key, secret, etc.)
- [ ] Implement encryption for API keys and secrets [Role: SYSTEM]
- [ ] Implement enable/disable gateway per outlet
- [ ] Create validation for gateway configuration

#### 3.5.3 Midtrans Integration [Role: SYSTEM]
- [ ] Install Midtrans SDK (`midtrans-client`)
- [ ] Create MidtransPaymentProcessor class implementing PaymentProcessor
- [ ] Implement createPayment for Midtrans (Snap/API)
- [ ] Implement webhook handler for Midtrans
- [ ] Implement payment verification
- [ ] Create API route for Midtrans webhook (`/api/webhooks/midtrans`)
- [ ] Implement error handling and retry logic
- [ ] Create tests for Midtrans integration

#### 3.5.4 Xendit Integration [Role: SYSTEM]
- [ ] Install Xendit SDK (`xendit-node`)
- [ ] Create XenditPaymentProcessor class implementing PaymentProcessor
- [ ] Implement createPayment for Xendit (Virtual Account/EWallet)
- [ ] Implement webhook handler for Xendit
- [ ] Implement payment verification
- [ ] Create API route for Xendit webhook (`/api/webhooks/xendit`)
- [ ] Implement error handling and retry logic
- [ ] Create tests for Xendit integration

#### 3.5.5 Payment Gateway UI Integration [Role: OWNER/STAFF]
- (Future/backlog) Payment gateways are **not used** for outlet laundry transactions at the moment.
- If implemented later, the main scope is **SaaS subscription payments** (not laundry order payments).

#### 3.5.6 Webhook Security & Verification [Role: SYSTEM]
- [ ] Implement webhook signature verification for Midtrans
- [ ] Implement webhook signature verification for Xendit
- [ ] Create webhook handler service with rate limiting
- [ ] Implement idempotency for webhook processing
- [ ] Create webhook logging and audit trail
- [ ] Implement webhook retry mechanism

#### 3.5.7 Payment Gateway Testing
- [ ] Create unit tests for the PaymentProcessor interface
- [ ] Create integration tests for Midtrans (using sandbox)
- [ ] Create integration tests for Xendit (using sandbox)
- [ ] Create E2E tests for payment flow with a gateway
- [ ] Test webhook handling with mock payloads

---

## 🔐 Phase 4: Security & Optimization

### 4.1 Advanced Security [Role: SYSTEM]
- [ ] Implement comprehensive tenant isolation
- [ ] Setup rate limiting for all public endpoints
- [ ] Implement CSRF protection
- [ ] Setup security headers in Next.js
- [ ] Implement input sanitization
- [ ] Create security audit checklist

### 4.2 Data Protection [Role: SYSTEM]
- [ ] Implement DTOs for all API responses
- [ ] Create response scrubbing utilities
- [ ] Implement data masking for sensitive fields
- [ ] Setup audit logging for critical operations
- [ ] Implement data retention policies

### 4.3 Performance Optimization [Role: SYSTEM]
- [ ] Implement database indexing
- [ ] Setup query optimization
- [ ] Implement caching strategy
- [ ] Optimize images with Next.js Image
- [ ] Setup CDN for static assets
- [ ] Implement lazy loading for components

### 4.4 Error Handling [Role: SYSTEM]
- [ ] Create global error boundary
- [ ] Implement error logging
- [ ] Create user-friendly error messages
- [ ] Setup error monitoring (optional: Sentry)

---

## 🧪 Phase 5: Testing & Quality Assurance

### 5.1 Unit Testing (Vitest) [Role: SYSTEM]
- [ ] Tests for repositories
- [ ] Tests for services
- [ ] Tests for utilities
- [ ] Tests for DTOs
- [ ] Setup test coverage reporting

### 5.2 Component Testing [Role: SYSTEM]
- [ ] Tests for AdminLTE components
- [ ] Tests for custom UI components
- [ ] Tests for forms
- [ ] Tests for data tables

### 5.3 Integration Testing [Role: SYSTEM]
- [ ] Tests for API routes
- [ ] Tests for authentication flow
- [ ] Tests for multi-tenancy isolation
- [ ] Tests for database operations

### 5.4 E2E Testing (Playwright) [Role: SYSTEM]
- [ ] Tests for user authentication
- [ ] Tests for order creation flow
- [ ] Tests for payment upload flow
- [ ] Tests for public tracking
- [ ] Tests for admin operations
- [ ] Tests for cross-browser compatibility

### 5.5 Security Testing [Role: SYSTEM]
- [ ] Tests for tenant isolation
- [ ] Tests for authorization
- [ ] Tests for input validation
- [ ] Tests for rate limiting
- [ ] Penetration testing (optional)

---

## 🚀 Phase 6: Deployment & Production

### 6.1 Vercel Deployment [Role: SYSTEM]
- [ ] Setup Vercel project
- [ ] Configure environment variables
- [ ] Setup database connection
- [ ] Deploy staging environment
- [ ] Setup custom domain
- [ ] Configure SSL certificates

### 6.2 Database Migration [Role: SYSTEM]
- [ ] Run production migrations
- [ ] Setup database backups
- [ ] Configure connection pooling
- [ ] Setup database monitoring

### 6.3 Monitoring & Analytics [Role: SYSTEM]
- [ ] Setup error monitoring
- [ ] Setup performance monitoring
- [ ] Setup user analytics (optional)
- [ ] Setup uptime monitoring

### 6.4 Documentation [Role: SYSTEM]
- [ ] Create API documentation
- [ ] Create user manual
- [ ] Create admin guide
- [ ] Update README.md
- [ ] Create deployment guide

---

## 📊 Progress Tracking

### Current Status: Owner Growth Focus (In Progress)

### Already in the codebase (quick verification)
- **Admin Panel (SUPERADMIN)**:
- Pages: `src/app/admin/outlets/**`, `src/app/admin/users/**`
- API: `src/app/api/admin/outlets/**`, `src/app/api/admin/users/**` (including reset PIN)
- **Dashboard Outlet (OWNER/STAFF)**:
- Pages: `src/app/dashboard/page.tsx`, `src/app/dashboard/settings/**` (settings index + change PIN + bank accounts)
- API: `src/app/api/dashboard/stats/**`, `src/app/api/dashboard/recent-orders/**`, `src/app/api/dashboard/settings/**`
- **Auth (Public/System)**:
- API: `src/app/api/auth/[...nextauth]/**`, `src/app/api/auth/register/**`, `src/app/api/auth/otp/**`

### Summary status
- ✅ Completed: see **✅ Implemented (Done)** above.
- 🚧 Not yet implemented: see **🚧 Roadmap (Priorities)** above.

### Current focus (Owner Growth)
1. Priority 1: OWNER Multi-Outlet (Foundation)
2. Priority 2: Outlet Landing Page + Settings
3. Priority 3: Staff Management (Owner)
4. Priority 4: POS (Owner/Staff)
5. Priority 5: Payment Verification + Subscription (SuperAdmin)
6. Priority 6: Housekeeping (System)

---

## 📝 Notes

- **REQUIRED**: Read and follow `.cursorrules` before coding
- Each task must follow SOLID principles
- All UI components must use AdminLTE v4 styling
- **REQUIRED**: Always use **SweetAlert2** for all notifications (success, error, warning, confirmation)
- **DO NOT** use `alert()`, `confirm()`, or `prompt()`
- Import: `import Swal from 'sweetalert2'` and `import 'sweetalert2/dist/sweetalert2.min.css'`
- **REQUIRED**: Prefer **Bootstrap 5 utility classes** over manual CSS or inline styles
- Use Bootstrap classes for spacing: `mb-3`, `pt-3`, `px-2`, `py-4`, etc.
- Use Bootstrap classes for colors: `text-primary`, `bg-success`, `text-muted`, etc.
- Use Bootstrap classes for typography: `fw-bold`, `text-center`, `small`, etc.
- Use Bootstrap classes for layout: `row`, `col-*`, `d-flex`, `justify-content-*`, etc.
- **Avoid** inline styles (`style={{ ... }}`) unless truly necessary
- **Avoid** custom CSS for styling that can be achieved with Bootstrap classes
- Each API endpoint must have Zod validation
- Each database query must include outlet filtering (CRITICAL)
- All sensitive data must be scrubbed before sending to the client
- Tests should be written for every new feature
- Use the DTO pattern for all API responses
- Multi-tenancy security is the top priority

### TODO: Conflicts / Needs alignment
- The latest RBAC defines SUPERADMIN only for the **Admin Panel** (not the Outlet Dashboard), but currently:
- `src/components/adminlte/DashboardLayout.tsx` still allows `SUPERADMIN` to see some `/dashboard/*` menus (Orders/Services/Customers/Transactions/Reports).
- `docs/ADMINLTE-SETUP.md` still states SUPERADMIN has all dashboard menus.
- Impact: potential UX confusion and links to non-existent pages (404) or access not aligned with the intended design.
- Recommended actions (this document only tracks; it does not change code):
- Align menu role filtering in `DashboardLayout.tsx` to match RBAC.
- Update `docs/ADMINLTE-SETUP.md` to match the latest role definitions.

### Recent Improvements (2026-01-24)
- ✅ Modern UI design for login and registration pages with a gradient background
- ✅ SweetAlert2 integration for better user experience
- ✅ Phone number normalization (store without + prefix for database storage)
- ✅ Improved error handling and logging for OTP verification
- ✅ Multi-step registration flow with a progress indicator
- ✅ Complete database schema implementation (Phase 1.4)
- ✅ Dashboard homepage with AdminLTE Info Box widgets (Phase 1.6)
- ✅ OrderRepository and TransactionRepository with outlet filtering
- ✅ DashboardService for dashboard statistics business logic
- ✅ API endpoints for dashboard stats and recent orders
- ✅ Comprehensive testing for dashboard features
- ✅ Outlet Management for SuperAdmin with full CRUD (Phase 1.7)
- ✅ Outlet DTO for response scrubbing
- ✅ API routes for outlet management with SuperAdmin authorization
- ✅ Outlet list page with AdminLTE styling
- ✅ Create/edit outlet form with automatic slug generation
- ✅ Outlet detail page with full information (users, bank accounts, payment gateways)
- ✅ Outlet status management (isPro toggle)
- ✅ Slug validation before submit with create vs update differences
- ✅ SweetAlert2 integration for all notifications
- ✅ Comprehensive testing for OutletRepository (CRUD, slug management, relations)
- ✅ Bank Account Management for Owner with full CRUD (Phase 1.8)
- ✅ BankAccountRepository with outlet filtering
- ✅ BankAccountDTO for response scrubbing
- ✅ API routes for bank account management with Owner authorization
- ✅ Bank account management page with AdminLTE styling
- ✅ Add/edit bank account form with full validation
- ✅ Bank account activation/deactivation toggle
- ✅ Bank account number validation (digits only)

### Recent Improvements (2026-01-25)
- ✅ User Management (SuperAdmin - Platform) MVP implementation:
- ✅ UI list & filter users (`/admin/users`)
- ✅ UI detail user (`/admin/users/[id]`)
- ✅ API admin users (`/api/admin/users`, `/api/admin/users/[id]`)
- ✅ Reset PIN admin (`/api/admin/users/[id]/reset-pin`) + WhatsApp best-effort
- ✅ Security guards: cannot self-deactivate, cannot demote/deactivate the last SuperAdmin
- ✅ UserDTO to scrub sensitive fields + UserRepository for data access

---

## 🔄 Review & Updates

This development plan is updated periodically based on progress and requirement changes.

**Last Updated**: 2026-01-26
**Version**: 1.12

### Changelog
- **v1.12 (2026-01-26)**:
- Reordered document: **✅ Implemented (Done)** moved to the top, then **🚧 Roadmap (Priorities)** sorted owner-growth-first
- Updated Progress Tracking to align with Roadmap (Priorities)
- **v1.11 (2026-01-26)**:
- Roadmap: OWNER multi-outlet support (concept `Outlet.ownerId` + outlet switcher/context)
- Revised Phase 1.9 into **Outlet Landing Page (Public)** + **no overclaim** principle
- Added roadmap **Landing Page Settings (Owner)** per outlet
- **v1.10 (2026-01-26)**:
- Retouched document structure: added `[Role: ...]` tags on each Phase section
- Added “Already in the codebase (quick verification)” to Progress Tracking
- Added TODO note for RBAC conflicts (DashboardLayout menu & AdminLTE docs)
- **v1.9 (2026-01-26)**:
- Corrected role definitions & access area separation (Admin Panel vs Outlet Dashboard)
- Added **Role Model & Access (RBAC)** section + impersonation support backlog
- Rescoped Phase 1.10 (User Management - SuperAdmin Platform) and added Phase 1.11 (Staff Management by OWNER)
- **v1.8 (2026-01-25)**:
- Completed Phase 1.10: User Management (SuperAdmin - Platform) MVP
- Added admin users API routes + reset PIN endpoint
- Added `/admin/users` list + `/admin/users/[id]` detail UI
- **v1.7 (2026-01-25)**:
- Roadmap focus on **SuperAdmin**
- Prioritized Phase 1.10 (User Management - SuperAdmin Platform) then Phase 3.2/3.3 (Payment Verification & Subscription)
- Marked Phase 1.9 (Outlet Landing Page - Public) as backlog for now
- **v1.6 (2026-01-24)**:
- Completed Phase 1.8: Bank Account Management (Owner)
- Added BankAccountRepository with outlet filtering
- Added BankAccountDTO for response scrubbing
- Added API routes for bank account CRUD operations
- Added bank account management page with AdminLTE styling
- Implemented bank account activation/deactivation toggle
- **v1.5 (2026-01-24)**:
- Updated task status: rate limiting and route protection completed
- Reorganized Phase 1: moved Security Implementation earlier (1.4)
- Removed duplicate: removed Phase 1.6.2 (Payment Gateway Configuration) because it duplicated Phase 3.5.2
- Updated numbering: Renumber Phase 1 sections (1.4→1.5, 1.5→1.6, 1.6→1.7, 1.6.1→1.8, 1.7→1.9, 1.8→1.10)
- Updated next steps with a more logical order
- **v1.4 (2026-01-24)**: Updated rules - Always use SweetAlert2 and Bootstrap utility classes (no inline styles/custom CSS)
- **v1.3 (2026-01-24)**: Completed Phase 1.6 (Outlet Management for SuperAdmin)
- **v1.2 (2026-01-24)**: Completed Phase 1.4 (Database Models) and Phase 1.5 (Dashboard Homepage)
- **v1.1 (2026-01-23)**: Completed Phase 1.1.1 - 1.1.6 (Authentication System foundation)
- **v1.0 (2026-01-23)**: Initial development plan