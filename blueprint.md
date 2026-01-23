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

O - Open/Closed: Modul pembayaran menggunakan interface PaymentProcessor. Menambah integrasi Midtrans atau Xendit di masa depan cukup menambah kelas baru tanpa mengubah kode inti.

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
enum TransType { SUBSCRIPTION; LAUNDRY_ORDER }

model Outlet {
  id            String   @id @default(uuid())
  name          String
  slug          String   @unique // URL: [domain.com/outlet/](https://domain.com/outlet/)[slug]
  address       String
  bankInfo      String?  // Informasi rekening untuk transfer pelanggan
  isPro         Boolean  @default(false)
  createdAt     DateTime @default(now())
  users         User[]
  services      Service[]
  orders        Order[]
}

model Order {
  id           String        @id @default(uuid())
  trackingCode String        @unique // Kode pendek acak untuk publik
  status       OrderStatus   @default(QUEUED)
  paymentStatus PaymentStatus @default(UNPAID)
  totalAmount  Float
  outletId     String
  outlet       Outlet        @relation(fields: [outletId], references: [id])
  transactions Transaction[]
}

model Transaction {
  id           String        @id @default(uuid())
  type         TransType     // Pembeda antara langganan SaaS atau pesanan cucian
  amount       Float
  proofUrl     String?       // URL gambar bukti transfer (Cloudinary)
  status       PaymentStatus @default(PENDING)
  externalId   String?       // ID referensi jika nanti menggunakan Payment Gateway
  orderId      String?
  order        Order?        @relation(fields: [orderId], references: [id])
  outletId     String?
}


🚀 5. Fitur Utama & Rencana Pengembangan

Fase 1: AdminLTE Dashboard Setup & Multi-Tenancy

Dashboard Layout: Integrasi AdminLTE sidebar, navbar, dan footer ke dalam Next.js.

Outlet Microsite: Halaman publik otomatis di /outlet/[slug] (Desain bersih & minimalis).

Isolasi Data: Setiap query wajib difilter menggunakan outlet_id.

Fase 2: POS dengan UI AdminLTE

Workflow Produksi: Visualisasi progress order menggunakan AdminLTE Steps atau Timeline.

Nota Digital: Halaman invoice ala AdminLTE yang bisa diunduh atau dibagikan ke WhatsApp.

Manajemen Harga: Tabel manajemen layanan per outlet menggunakan Bootstrap Datatables.

Fase 3: Sistem Pembayaran Manual & Admin Panel

B2C Payment: Halaman tracking dengan form upload bukti bayar.

B2B Subscription: Panel khusus SuperAdmin (Anda) untuk verifikasi pembayaran owner menggunakan widget "Info Box" AdminLTE.

🔐 6. Security & Data Protection (API Best Practices)

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

🤖 7. Instruksi Khusus untuk AI (Prompting Guide)

Gunakan instruksi ini saat meminta AI menuliskan kode:

Security: "Pastikan setiap response API telah difilter agar tidak mengekspos field sensitif dari database."

UI Design: "Gunakan struktur HTML dan kelas CSS dari AdminLTE v4 (Bootstrap 5) untuk setiap elemen dashboard."

Multi-tenant Context: "Selalu sertakan filter outlet_id dalam setiap operasi database."

Icons: "Gunakan FontAwesome (default AdminLTE) untuk ikon navigasi dan tombol aksi."

📈 8. Strategi Transisi Berbayar

Fase Awal: Semua fitur dibuka secara gratis (Dev Mode) untuk menarik minat.

Fase Transisi: Berikan label "BETA" pada fitur premium (e.g., Laporan Keuangan Grafik AdminLTE).

Sistem Langganan: Gunakan tabel Transaction untuk memantau masa aktif setiap outlet secara manual.

Dokumentasi ini dikembangkan untuk: Sistem Laundry Multi-User Ainul