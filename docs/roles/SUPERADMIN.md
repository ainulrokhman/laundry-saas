# Role: SUPERADMIN (Admin SaaS)

SUPERADMIN adalah admin **platform SaaS**. Fokusnya adalah mengelola sistem (cross-outlet) dan operasional platform, bukan operasional outlet harian.

---

## Fitur Utama

### 1. Subscription Management (SaaS Relationship)

- **Kelola Packages** (`SubscriptionPackage`): Definisikan pricing, limits (`maxOutlets`, `maxStaff`), dan fitur
- **Kelola User Subscriptions**:
  - Relasi: `User` -> `SubscriptionPackage`
  - Updates: Admin dapat upgrade/downgrade paket User secara manual
  - Expiry: Monitor `User.subscriptionExpiresAt`

### 2. Outlet Management

- View semua outlet (Global List)
- Nonaktifkan outlet (untuk pelanggaran TOS)

### 3. User Management

- View semua Owners (`User` list)
- Reset PIN / Lock Account

### 4. Payment Verification

- Verifikasi bukti transfer manual untuk pembayaran Subscription

---

## Struktur Menu

| Menu | Fitur |
|------|-------|
| **Dashboard** | Metrik kesehatan platform |
| **Users** | List semua Owner & Staff terdaftar |
| **Outlets** | List semua Outlet terdaftar di sistem |
| **Packages** | CRUD Subscription Packages |
| **Payments / Verifikasi** | List bukti transfer pending |
| **Bank Accounts (Admin)** | Rekening tujuan untuk pembayaran subscription |

---

## Catatan Arsitektur (Perubahan Terkini)

- **Perubahan Relasi**: Subscription sekarang terhubung ke `User` (Owner), bukan `Outlet`
- **Dampak Schema**: `Outlet.packageId` dihapus, `User.packageId` ditambahkan
- **Quota Enforcement**: Logic pindah ke `POST /api/dashboard/outlets` untuk cek `User.package.maxOutlets`

---

## Pembatasan (Tidak Diizinkan)

- Tidak boleh melakukan operasional outlet harian (POS, update status order) sebagai aktivitas utama
- Tidak boleh mengubah konfigurasi outlet yang seharusnya milik OWNER (e.g., bank accounts, payment configuration outlet) kecuali diperlukan oleh kebijakan platform

---

## Catatan Keamanan

- Akses SUPERADMIN dipisahkan dari akses dashboard outlet untuk menjaga model multi-tenancy dan meminimalkan risiko kebocoran data
- Semua aksi administratif harus dicatat (audit/logging) untuk traceability

---

## Backlog SUPERADMIN

- [ ] **Impersonation untuk support (optional)**: SUPERADMIN dapat impersonate OWNER/STAFF untuk troubleshooting, dengan audit log yang jelas (siapa impersonate siapa, kapan, dan mengapa)
