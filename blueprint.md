📘 Blueprint Arsitektur: Laundry SaaS Platform (Project: Ainul Laundry)

Dokumen ini adalah panduan teknis utama untuk membangun sistem manajemen laundry multi-tenant yang dioptimalkan untuk Vercel, menggunakan prinsip SOLID, dan berbasis UI AdminLTE v4 (Bootstrap 5). Semua teknologi menggunakan versi LTS atau versi stabil/konservatif untuk stabilitas jangka panjang.

🏗️ 1. Arsitektur Sistem & Infrastruktur

Sistem ini dibangun dengan pendekatan Serverless Multi-Tenancy untuk memastikan efisiensi biaya dan performa tinggi bagi pengguna di Indonesia.

Komponen

Teknologi

Keterangan

Framework

Next.js 16.x LTS (App Router)


Deployment di Vercel untuk performa serverless. Menggunakan versi LTS untuk stabilitas jangka panjang.

React

React 18.3.1 (Konservatif)


Menggunakan React 18.3.1 untuk pendekatan konservatif dan stabilitas maksimal. Kompatibel dengan Next.js 16 (minimum 18.2.0).

UI Framework

AdminLTE v4 (Bootstrap 5)

Menggunakan dashboard template AdminLTE v4.0.0-rc4 dengan Bootstrap 5 untuk UI Admin & Owner.

Database

PostgreSQL (Neon.tech) - LTS

Lokasi: Singapore (ap-southeast-1). Menggunakan versi PostgreSQL LTS.

ORM

Prisma (LTS) / Drizzle

Manajemen skema, tipe data, dan migrasi. Gunakan versi LTS untuk stabilitas.

Storage

Cloudinary / Supabase Storage

Untuk bukti transfer, logo outlet, dan aset gambar. Gunakan versi LTS/stable dari layanan yang dipilih.

WhatsApp Service

Fonnte API (Extensible)

Untuk mengirim OTP via WhatsApp. Menggunakan interface WhatsAppService untuk ekstensibilitas, sehingga bisa diganti dengan provider lain (Twilio, WhatsApp Business API, dll) tanpa mengubah kode inti.

Auth

NextAuth.js v5 (Auth.js)

Role-based Access Control: SUPERADMIN, OWNER, STAFF. Menggunakan versi terbaru yang kompatibel dengan Next.js 16.

Testing

Vitest + Playwright

Vitest untuk unit testing dan component testing. Playwright untuk E2E testing dan testing async Server Components.

Region

Singapore (sin1)

Latensi terendah dan akses tercepat untuk user lokal.

🛠️ 2. Implementasi SOLID Principle

Untuk menjaga kode tetap bersih, modular, dan mudah dikembangkan di masa depan:

S - Single Responsibility: Memisahkan kode menjadi layer yang jelas: Repositories (Akses DB), Services (Logika Bisnis), dan Controllers (API Handler). UI AdminLTE dipisahkan ke dalam Components yang dapat digunakan kembali.

O - Open/Closed: Modul pembayaran menggunakan interface PaymentProcessor. Menambah integrasi Midtrans, Xendit, atau payment gateway lain di masa depan cukup menambah kelas baru yang implement PaymentProcessor interface tanpa mengubah kode inti. Database schema sudah disiapkan dengan model PaymentGatewayConfig untuk menyimpan konfigurasi per outlet.

L - Liskov Substitution: Semua jenis layanan (Kiloan, Satuan, atau Paket) ditangani oleh entitas yang seragam.

I - Interface Segregation: API untuk pelanggan publik (Public Tracking) dipisah total dari API internal Dashboard AdminLTE.

D - Dependency Inversion: Logika bisnis bergantung pada abstraksi interface, bukan langsung pada database atau library spesifik.

🎨 3. UI/UX Standard (AdminLTE)

Dashboard internal akan mengimplementasikan komponen AdminLTE untuk pengalaman pengguna yang profesional:

Sidebar Navigation: Menu yang dikategorikan berdasarkan peran (Owner vs Staff).

Cards & Widgets: Menampilkan ringkasan statistik (Order hari ini, Omzet, Cucian tertunda) di dashboard utama.

Datatables: Digunakan untuk daftar pesanan dengan fitur pencarian dan filter status.

Modals: Digunakan untuk input pesanan cepat dan detail transaksi.

Status Badges: Label warna (AdminLTE Colors) untuk status (e.g., bg-warning untuk Washing, bg-success untuk Ready).

🗄️ 4. Skema Database (Prisma Source of Truth)

enum Role { SUPERADMIN; OWNER; STAFF }
enum OrderStatus { QUEUED; WASHING; DRYING; IRONING; READY; TAKEN }
enum PaymentStatus { UNPAID; PENDING; SETTLEMENT; FAILURE }
enum PaymentMethod { 
  CASH;           // Pembayaran tunai langsung
  TRANSFER;       // Transfer bank manual (upload bukti)
  MIDTRANS;       // Payment Gateway: Midtrans
  XENDIT;         // Payment Gateway: Xendit
  // Gateway lain dapat ditambahkan di masa depan tanpa mengubah struktur
}
enum TransType { SUBSCRIPTION; LAUNDRY_ORDER }

model User {
  id          String   @id @default(uuid())
  phone       String   @unique // Nomor WhatsApp (format: 6281234567890)
  name        String
  pin         String   // Hashed PIN (4-6 digit, menggunakan bcrypt)
  role        Role     @default(OWNER)
  outletId    String?
  outlet      Outlet?  @relation(fields: [outletId], references: [id])
  isActive    Boolean  @default(true)
  isPinSet    Boolean  @default(false) // Flag untuk cek apakah PIN sudah di-set (setelah register)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastLoginAt DateTime?
  pinChangedAt DateTime? // Timestamp terakhir PIN diubah
}

model OtpCode {
  id        String   @id @default(uuid())
  phone     String   // Nomor WhatsApp
  code      String   // Kode OTP (6 digit)
  type      OtpType  // REGISTER (hanya untuk registrasi pemilik toko)
  expiresAt DateTime // Expiry time (5 menit)
  isUsed    Boolean  @default(false)
  createdAt DateTime @default(now())
  
  @@index([phone, code, isUsed])
  @@index([expiresAt])
}

enum OtpType { REGISTER } // OTP hanya untuk registrasi, login menggunakan PIN

model Outlet {
  id            String                @id @default(uuid())
  name          String
  slug          String                @unique // URL: [domain.com/outlet/](https://domain.com/outlet/)[slug]
  address       String
  isPro         Boolean               @default(false)
  createdAt     DateTime              @default(now())
  users         User[]
  services      Service[]
  orders        Order[]
  bankAccounts  BankAccount[]         // Multiple rekening bank untuk transfer pelanggan
  paymentGatewayConfigs PaymentGatewayConfig[] // Konfigurasi payment gateway per outlet
}

model BankAccount {
  id          String        @id @default(uuid())
  outletId    String
  outlet      Outlet        @relation(fields: [outletId], references: [id], onDelete: Cascade)
  bankName    String        // Nama bank (e.g., "BCA", "Mandiri", "BNI")
  accountName String        // Nama pemilik rekening
  accountNumber String      // Nomor rekening
  isActive    Boolean       @default(true) // Untuk enable/disable rekening tertentu
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  transactions Transaction[] // Transaksi yang menggunakan rekening ini
}

model Order {
  id           String        @id @default(uuid())
  trackingCode String        @unique // Kode pendek acak untuk publik
  status       OrderStatus   @default(QUEUED)
  paymentStatus PaymentStatus @default(UNPAID)
  paymentMethod PaymentMethod? // Metode pembayaran: CASH, TRANSFER, MIDTRANS, atau XENDIT (null jika belum dibayar)
  totalAmount  Float
  outletId     String
  outlet       Outlet        @relation(fields: [outletId], references: [id])
  transactions Transaction[]
}

model PaymentGatewayConfig {
  id            String        @id @default(uuid())
  outletId      String
  outlet        Outlet        @relation(fields: [outletId], references: [id], onDelete: Cascade)
  gatewayType   PaymentMethod // MIDTRANS atau XENDIT
  isActive      Boolean       @default(false) // Enable/disable gateway tertentu
  apiKey        String        // Encrypted API key untuk gateway
  secretKey     String?       // Encrypted secret key (jika diperlukan)
  merchantId    String?       // Merchant ID (jika diperlukan)
  webhookSecret String?       // Secret untuk verifikasi webhook
  config        Json?         // Konfigurasi tambahan dalam format JSON (flexible)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  transactions  Transaction[]
  
  @@unique([outletId, gatewayType]) // Satu outlet hanya bisa punya satu config per gateway type
}

model Transaction {
  id           String        @id @default(uuid())
  type         TransType     // Pembeda antara langganan SaaS atau pesanan cucian
  amount       Float
  paymentMethod PaymentMethod? // Metode pembayaran: CASH, TRANSFER, MIDTRANS, XENDIT
  proofUrl     String?       // URL gambar bukti transfer (Cloudinary) - hanya untuk TRANSFER
  status       PaymentStatus @default(PENDING)
  externalId   String?       // ID referensi dari Payment Gateway (transaction_id dari Midtrans/Xendit)
  gatewayTransactionId String? // ID transaksi unik dari gateway (untuk tracking)
  gatewayResponse Json?      // Response lengkap dari gateway (untuk debugging/audit)
  webhookData  Json?         // Data webhook dari gateway (untuk verifikasi)
  orderId      String?
  order        Order?        @relation(fields: [orderId], references: [id])
  outletId     String?
  bankAccountId String?      // ID rekening yang digunakan (jika paymentMethod = TRANSFER)
  bankAccount  BankAccount?  @relation(fields: [bankAccountId], references: [id])
  paymentGatewayConfigId String? // ID konfigurasi gateway yang digunakan
  paymentGatewayConfig PaymentGatewayConfig? @relation(fields: [paymentGatewayConfigId], references: [id])
}


🔐 5. Authentication & Authorization Flow

Sistem autentikasi menggunakan WhatsApp OTP untuk registrasi dan PIN untuk login:

**Registrasi (Hanya untuk OWNER):**
1. User input nomor WhatsApp
2. Sistem kirim OTP via WhatsApp (menggunakan Fonnte API)
3. User verifikasi OTP (6 digit, berlaku 5 menit)
4. User input data outlet (nama, alamat) dan set PIN (4-6 digit)
5. Sistem create User dengan role OWNER dan Outlet baru
6. User langsung login setelah registrasi berhasil

**Login:**
1. User input nomor WhatsApp dan PIN
2. Sistem verifikasi PIN (bcrypt comparison)
3. Jika valid, create session dengan NextAuth.js
4. Session include: userId, outletId, role
5. Redirect ke dashboard sesuai role

**Security:**
- PIN di-hash menggunakan bcrypt sebelum disimpan
- OTP hanya untuk registrasi, tidak untuk login
- Rate limiting untuk prevent brute force (PIN dan OTP)
- Session management dengan NextAuth.js v5
- Multi-tenant isolation: session selalu include outletId

**WhatsApp Service Architecture:**
- Menggunakan interface WhatsAppService untuk ekstensibilitas
- Implementasi FonnteWhatsAppService untuk provider Fonnte
- Bisa diganti dengan provider lain (Twilio, WhatsApp Business API) tanpa mengubah kode inti
- Support untuk template message OTP

🚀 6. Fitur Utama & Rencana Pengembangan

Fase 1: AdminLTE Dashboard Setup & Multi-Tenancy

Dashboard Layout: Integrasi AdminLTE sidebar, navbar, dan footer ke dalam Next.js.

Outlet Microsite: Halaman publik otomatis di /outlet/[slug] (Desain bersih & minimalis).

Isolasi Data: Setiap query wajib difilter menggunakan outlet_id.

Fase 1.5: Authentication & Registration

WhatsApp OTP Registration: Sistem registrasi untuk pemilik toko menggunakan OTP via WhatsApp (Fonnte API).

PIN-based Login: Sistem login menggunakan nomor WhatsApp dan PIN (4-6 digit).

WhatsApp Service Integration: Implementasi interface WhatsAppService dengan provider Fonnte (extensible untuk provider lain).

Fase 2: POS dengan UI AdminLTE

Workflow Produksi: Visualisasi progress order menggunakan AdminLTE Steps atau Timeline.

Nota Digital: Halaman invoice ala AdminLTE yang bisa diunduh atau dibagikan ke WhatsApp.

Manajemen Harga: Tabel manajemen layanan per outlet menggunakan Bootstrap Datatables.

Fase 3: Sistem Pembayaran Manual & Admin Panel

B2C Payment: Halaman tracking dengan form upload bukti bayar (untuk pembayaran transfer). Dukungan pembayaran tunai langsung di POS.

Multiple Bank Accounts: Setiap outlet dapat memiliki lebih dari satu rekening bank untuk transfer pelanggan.

Payment Methods: Sistem mendukung multiple metode pembayaran:
- **CASH**: Pembayaran tunai langsung di outlet (tidak perlu bukti transfer)
- **TRANSFER**: Pembayaran via transfer bank manual (memerlukan upload bukti transfer)
- **MIDTRANS**: Payment Gateway Midtrans (otomatis, real-time verification via webhook)
- **XENDIT**: Payment Gateway Xendit (otomatis, real-time verification via webhook)
- Gateway lain dapat ditambahkan di masa depan tanpa mengubah struktur inti (mengikuti Open/Closed Principle)

Payment Gateway Architecture:
- Setiap outlet dapat mengaktifkan multiple payment gateway (Midtrans, Xendit, dll)
- Konfigurasi gateway disimpan terpisah per outlet (multi-tenant safe)
- Menggunakan interface PaymentProcessor untuk ekstensibilitas
- Webhook handling untuk real-time payment verification
- Support untuk berbagai metode pembayaran gateway (e-wallet, virtual account, credit card, dll)

B2B Subscription: Panel khusus SuperAdmin (Anda) untuk verifikasi pembayaran owner menggunakan widget "Info Box" AdminLTE.

🔐 7. Security & Data Protection (API Best Practices)

Untuk mencegah kebocoran data antar tenant (outlet) dan eksposur data sensitif:

Tenant Isolation (Strict Filtering):

Setiap API request wajib melakukan verifikasi session.outletId.

Gunakan Middleware untuk memastikan user tidak bisa mengakses atau memodifikasi data milik outlet_id lain.

Query Pattern: prisma.order.findMany({ where: { id: orderId, outletId: session.outletId } }).

Response Data Scrubbing (DTO):

Jangan pernah mengembalikan objek database secara mentah (raw) ke API.

Selalu buat fungsi toResponse() atau gunakan DTO (Data Transfer Object) untuk membuang field sensitif seperti password, isPro (untuk manipulasi client-side), atau ID internal yang tidak perlu.

Rate Limiting & Protection:

Implementasikan Rate Limiting di Vercel Edge untuk mencegah brute-force pada halaman Public Tracking.

Gunakan Zod untuk validasi input schema pada setiap endpoint API guna mencegah SQL Injection atau Malicious Payloads.

Public Tracking Privacy:

Halaman pelacakan publik hanya boleh menampilkan data minimal (Status, Nama Pelanggan yang disensor seperti An***, dan estimasi selesai).

Gunakan trackingCode (random string) alih-alih ID internal (Primary Key) untuk URL publik.

🤖 8. Instruksi Khusus untuk AI (Prompting Guide)

Gunakan instruksi ini saat meminta AI menuliskan kode:

Security: "Pastikan setiap response API telah difilter agar tidak mengekspos field sensitif dari database."

UI Design: "Gunakan struktur HTML dan kelas CSS dari AdminLTE v4 (Bootstrap 5) untuk setiap elemen dashboard."

Multi-tenant Context: "Selalu sertakan filter outlet_id dalam setiap operasi database."

Icons: "Gunakan FontAwesome (default AdminLTE) untuk ikon navigasi dan tombol aksi."

📈 9. Strategi Transisi Berbayar

Fase Awal: Semua fitur dibuka secara gratis (Dev Mode) untuk menarik minat.

Fase Transisi: Berikan label "BETA" pada fitur premium (e.g., Laporan Keuangan Grafik AdminLTE).

Sistem Langganan: Gunakan tabel Transaction untuk memantau masa aktif setiap outlet secara manual.

Dokumentasi ini dikembangkan untuk: Sistem Laundry Multi-User Ainul