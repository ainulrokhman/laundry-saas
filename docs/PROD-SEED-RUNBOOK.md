## Runbook: Seed Demo ke Production

Dokumen ini menjelaskan cara menjalankan seed **demo** ke database production dengan aman (sejauh mungkin) dan sesuai model role terbaru:
- **SUPERADMIN**: tanpa `outletId`
- **OWNER**: kepemilikan outlet via `Outlet.ownerId` (bisa multi-outlet); `User.outletId` = outlet aktif
- **STAFF**: single-outlet (`User.outletId` wajib)

> Peringatan: seed demo di production berisiko menambah data “sampah” (terutama orders/transactions). Gunakan prefix dan flag keamanan.

### 1) Siapkan environment
- Pastikan Anda menjalankan perintah dari folder project.
- Set `DATABASE_URL` ke connection string production (sementara).

### 2) Sync schema production (non-destructive)
Jalankan tanpa `--accept-data-loss` agar proses berhenti jika Prisma mendeteksi potensi destructive.

```bash
npx prisma db push --skip-generate
```

### 3) Jalankan seed demo (full demo)
Perintah ini akan:
- Backfill `Outlet.ownerId` untuk data legacy yang masih null (berdasarkan OWNER lama dengan `user.outletId == outlet.id`)
- Buat outlet demo dengan prefix (default `demo-...`)
- Buat OWNER demo (multi-outlet) + STAFF demo
- Buat services + bank accounts
- Buat sample orders + transactions (karena `SEED_INCLUDE_TRANSACTIONS=1`)

```bash
ALLOW_PROD_SEED=1 \
SEED_PREFIX=demo \
SEED_INCLUDE_TRANSACTIONS=1 \
SEED_USE_DEMO_PHONES=1 \
npx prisma db seed
```

### 4) (Opsional) Custom phone numbers (lebih aman)
Kalau tidak ingin memakai nomor default demo, set:
- `SEED_OWNER_PHONES` (minimal 2 nomor, dipisahkan koma)
- `SEED_STAFF_PHONES` (minimal 6 nomor, dipisahkan koma; 2 staff per outlet demo)

Contoh:

```bash
ALLOW_PROD_SEED=1 \
SEED_PREFIX=demo \
SEED_INCLUDE_TRANSACTIONS=1 \
SEED_OWNER_PHONES=6288111111111,6288222222222 \
SEED_STAFF_PHONES=6288333333333,6288444444444,6288555555555,6288666666666,6288777777777,6288888888888 \
npx prisma db seed
```

### 5) Verifikasi cepat
- Cek outlet demo: `slug` diawali `demo-` dan `ownerId` terisi.
- Cek OWNER demo A memiliki >=2 outlet (`Outlet.ownerId` sama).
- Cek STAFF punya `outletId` (single outlet).
- Cek SUPERADMIN tidak punya `outletId`.

