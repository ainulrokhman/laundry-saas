# Role: OWNER (Tenant Admin)

OWNER adalah pemilik outlet yang bertanggung jawab atas konfigurasi dan operasional outlet. OWNER juga dapat mengelola akun STAFF untuk outlet-nya.

**Catatan Penting**: 
- OWNER dapat memiliki **multi-outlet** (lebih dari satu cabang)
- **Subscription ada di level OWNER (User)**, bukan di level Outlet
- Dashboard actions selalu berjalan dalam **outlet aktif** (outlet context) yang dipilih user

---

## Model Subscription (Owner-Level)

Subscription dikelola di level User (OWNER), dengan struktur:

```
User (OWNER)
├── packageId → SubscriptionPackage
├── subscriptionExpiresAt
├── subscriptionStartedAt
└── ownedOutlets[] → Outlet (1 Owner : N Outlets)
```

### Quota Berdasarkan Paket

| Paket | maxOutlets | maxStaff | Fitur |
|-------|------------|----------|-------|
| Bersih | 1 | 3 | Fitur dasar |
| Wangi | 3 | 10 | + Multi-outlet |
| Licin | Unlimited | Unlimited | + Semua fitur |

---

## Fitur Utama

### 1. Subscription & Outlet Management (Global Level)
- **Kelola Subscription**: Lihat status paket, upgrade plan, bayar tagihan
- **Kelola Outlet**: Buat, update, nonaktifkan outlet (sesuai quota paket)
- **Switch Outlet**: Pilih outlet aktif untuk context dashboard

### 2. Dashboard & Operasional Outlet (Per-Outlet)
- Lihat ringkasan performa outlet (dashboard)
- Kelola order dan workflow operasional
- Kelola pelanggan

### 3. Service Management (Per-Outlet)
- Buat/update/nonaktifkan layanan outlet
- Kelola harga dan deskripsi layanan

### 4. Settings (Per-Outlet)
- Kelola rekening bank outlet untuk transfer manual
- Konfigurasi fitur outlet
- Ubah PIN sendiri

### 5. Landing Page Settings (Per-Outlet)
- Konfigurasi konten landing page publik outlet
- Deskripsi, WhatsApp/kontak, jam operasional

### 6. Staff Management (Per-Outlet)
- Buat akun STAFF untuk outlet yang sama
- Update data STAFF (nama/telepon) dan status aktif/nonaktif
- Nonaktifkan STAFF bila diperlukan

### 7. Reports

#### a. Laporan Per-Outlet (Outlet Context)
- Laporan operasional outlet (harian/mingguan/bulanan)
- Pendapatan, pengeluaran, laba bersih
- Piutang pelanggan

#### b. Laporan Global (Semua Outlet) - NEW
- **Agregasi dari semua outlet yang dimiliki**
- Total pendapatan gabungan semua cabang
- Total pengeluaran gabungan semua cabang
- Perbandingan performa antar cabang
- Breakdown per outlet (revenue, orders, expenses)

---

## Struktur Menu & Scope

### 1. Global / Tenant Level (Tanpa Outlet Aktif)

Item ini berlaku untuk Akun/Bisnis secara keseluruhan, lintas outlet.

| Menu | Fitur |
|------|-------|
| **Settings > Manajemen Outlet** | Tambah, lihat, edit semua cabang |
| **Settings > Paket Langganan** | Kelola subscription dan invoice |
| **Settings > Profile** | Ubah PIN, info personal |
| **Reports > Mode Global** | Laporan gabungan semua outlet |

### 2. Single Outlet Level (Perlu Outlet Context)

Item ini hanya menampilkan data spesifik untuk **outlet yang sedang dipilih** di navbar.

| Menu | Fitur |
|------|-------|
| **Dashboard** | Ringkasan performa outlet |
| **Sales / POS** | Interface kasir untuk outlet ini |
| **Orders** | Riwayat order untuk outlet ini |
| **Customers** | Database pelanggan outlet ini |
| **Services** | Produk/layanan yang dijual di outlet ini |
| **Settings (Outlet)** | Bank accounts, payment gateways, staff |
| **Reports > Mode Outlet** | Laporan khusus outlet ini |

---

## Pembatasan (Tidak Diizinkan)

- Tidak boleh mengelola outlet di luar kepemilikan OWNER
- Tidak boleh menaikkan role ke OWNER/SUPERADMIN (role escalation)
- Tidak boleh mengakses fitur admin platform (SUPERADMIN)

---

## Catatan Keamanan

- Semua data yang ditampilkan/dimodifikasi OWNER harus selalu di-scope ke outlet aktif (tenant isolation)
- Data subscription di-scope ke OWNER (User)
- Operasi sensitif (bank accounts, payment configuration) harus dibatasi hanya untuk OWNER
- Mode Global Reports hanya mengakses outlet milik OWNER sendiri (via `ownedOutlets`)

---

## Backlog OWNER

- [ ] Upload bukti pembayaran subscription (transfer manual) dan lihat status verifikasi
- [x] Global Reports - Laporan agregasi dari semua outlet
