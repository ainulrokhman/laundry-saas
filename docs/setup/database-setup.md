# Database Setup Guide

Panduan lengkap untuk setup database PostgreSQL dengan Prisma ORM untuk Laundry SaaS Platform.

## 📋 Prerequisites

1. Akun Neon.tech (gratis) - [https://neon.tech](https://neon.tech)
2. Node.js 18+ terinstall
3. npm atau yarn terinstall

## 🗄️ Setup PostgreSQL di Neon.tech

### 1. Buat Database Baru

1. Login ke [Neon.tech](https://neon.tech)
2. Klik "Create Project"
3. Pilih **Singapore (ap-southeast-1)** sebagai region
4. Beri nama project (contoh: "laundry-saas")
5. Klik "Create Project"

### 2. Dapatkan Connection String

1. Setelah project dibuat, klik "Connection Details"
2. Copy **Connection String** (format: `postgresql://user:password@host:port/database?sslmode=require`)
3. Simpan connection string ini untuk digunakan di `.env.local`

## 🔧 Setup Prisma

### 1. Install Dependencies

```bash
npm install
```

Dependencies yang diperlukan sudah termasuk:
- `@prisma/client` - Prisma Client
- `prisma` - Prisma CLI
- `bcryptjs` - Password hashing untuk seed data
- `tsx` - TypeScript executor untuk seed script
- `dotenv-cli` - Load environment variables from `.env.local` for Prisma commands

### 2. Setup Environment Variables

Buat file `.env.local` di root project:

```bash
cp .env.example .env.local
```

Edit `.env.local` dan isi dengan connection string dari Neon.tech:

```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Generate NEXTAUTH_SECRET:**
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

Command ini akan:
- Membaca `prisma/schema.prisma`
- Generate TypeScript types untuk Prisma Client
- Membuat client di `node_modules/.prisma/client`

### 4. Push Schema ke Database

**Untuk Development (menggunakan db push):**
```bash
npm run db:push
```

**Untuk Production (menggunakan migrations):**
```bash
npm run db:migrate
```

`db:push` akan:
- Membuat/mengupdate tabel di database
- Tidak membuat migration files (cocok untuk development)
- Sync schema dengan database

`db:migrate` akan:
- Membuat migration files di `prisma/migrations/`
- Track perubahan schema
- Cocok untuk production dan version control

### 5. Seed Database

Jalankan seed script untuk mengisi database dengan data testing:

```bash
npm run db:seed
```

Seed data yang akan dibuat:
- **2 Outlets** (Pusat & Depok)
- **4 Users** (1 SuperAdmin, 2 Owners, 1 Staff)
- **7 Services** (berbagai jenis layanan)
- **4 Orders** (dengan berbagai status)
- **3 Transactions** (payment & subscription)

**Test Credentials:**
- SuperAdmin: `superadmin@ainullaundry.com` / `password123`
- Owner 1: `owner1@ainullaundry.com` / `password123`
- Staff 1: `staff1@ainullaundry.com` / `password123`
- Owner 2: `owner2@ainullaundry.com` / `password123`

### 6. Test Credentials

Setelah seed database, verifikasi bahwa credentials berfungsi dengan benar:

#### Method 1: Menggunakan Test Script (Recommended)

Jalankan script test otomatis:

```bash
npm run db:test-credentials
```

Script ini akan:
- ✅ Memverifikasi semua user credentials
- ✅ Test password hashing (bcrypt)
- ✅ Verifikasi role assignment
- ✅ Menampilkan informasi user dan outlet
- ✅ Memberikan summary hasil test

**Output yang diharapkan:**
```
🔐 Testing Credentials...

Testing: superadmin@ainullaundry.com
Expected Role: SUPERADMIN
✅ PASSED: Credentials valid
   - User ID: [uuid]
   - Name: Super Admin
   - Role: SUPERADMIN
   - Outlet: Ainul Laundry - Cabang Pusat (ainul-laundry-pusat)
   - Password: Valid

...

📊 Test Summary:
   ✅ Passed: 4
   ❌ Failed: 0
   📝 Total: 4

✨ All credentials are valid!
```

#### Method 2: Menggunakan Prisma Studio

1. Buka Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Prisma Studio akan terbuka di browser (default: `http://localhost:5555`)

3. Navigate ke model **User**

4. Verifikasi data user:
   - Email: `superadmin@ainullaundry.com`
   - Role: `SUPERADMIN`
   - Password: Ter-hash dengan bcrypt (tidak bisa dibaca langsung)
   - Outlet: Terhubung ke outlet yang benar

5. Test credentials lainnya dengan cara yang sama

#### Method 3: Manual Test dengan Script

Buat file test manual (opsional):

```typescript
// test-manual.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findUnique({
    where: { email: "superadmin@ainullaundry.com" },
  });

  if (user) {
    const isValid = await bcrypt.compare("password123", user.password);
    console.log("Password valid:", isValid);
    console.log("User role:", user.role);
  }
}

test();
```

Jalankan dengan:
```bash
dotenv -e .env.local -- tsx test-manual.ts
```

## 📊 Database Schema

### Models

1. **User** - Pengguna sistem (SUPERADMIN, OWNER, STAFF)
2. **Outlet** - Tenant/outlet laundry
3. **Service** - Layanan laundry (Kiloan, Satuan, Paket)
4. **Order** - Pesanan cucian
5. **Transaction** - Transaksi pembayaran & subscription

### Enums

- **Role**: SUPERADMIN, OWNER, STAFF
- **OrderStatus**: QUEUED, WASHING, DRYING, IRONING, READY, TAKEN
- **PaymentStatus**: UNPAID, PENDING, SETTLEMENT, FAILURE
- **TransType**: SUBSCRIPTION, LAUNDRY_ORDER

Lihat detail lengkap di [database-schema.md](../architecture/database-schema.md)

## 🛠️ Prisma Commands

### Development Commands

```bash
# Generate Prisma Client
npm run db:generate

# Push schema changes to database (development)
npm run db:push

# Create and apply migration (production-ready)
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database
npm run db:seed

# Test credentials after seeding
npm run db:test-credentials

# Reset database (drop all data, re-run migrations, seed)
npm run db:reset
```

### Prisma Configuration

Prisma configuration is managed in `prisma.config.ts` (not in `package.json` anymore).

The seed command is configured in `prisma.config.ts`:
```typescript
export default {
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
};
```

This replaces the deprecated `package.json#prisma` configuration.

### Environment Variables Loading

**Important:** Prisma CLI only reads `.env` files by default, not `.env.local`. 

To use `.env.local` with Prisma commands, all database scripts use `dotenv-cli` to load environment variables:

```bash
dotenv -e .env.local -- prisma [command]
```

This ensures that:
- Next.js uses `.env.local` for development
- Prisma commands can access `DATABASE_URL` from `.env.local`
- You can keep separate `.env` and `.env.local` files for different environments

### Production Commands

```bash
# Deploy migrations to production
npm run db:migrate:deploy
```

## 🔍 Menggunakan Prisma Client

### Import Prisma Client

```typescript
import prisma from "@/lib/prisma";

// Example: Get all outlets
const outlets = await prisma.outlet.findMany();

// Example: Get orders for specific outlet (tenant isolation)
const orders = await prisma.order.findMany({
  where: {
    outletId: "outlet-id-here"
  }
});
```

### Best Practices

1. **Always use the singleton** from `@/lib/prisma` (not create new instances)
2. **Always filter by outletId** for tenant isolation
3. **Use transactions** for multiple related operations
4. **Handle errors** properly with try-catch

## 🔐 Security Notes

1. **Never commit `.env.local`** - File ini berisi credentials sensitif
2. **Use different databases** untuk development dan production
3. **Rotate secrets** secara berkala
4. **Use connection pooling** untuk production (Neon.tech sudah include)

## 🐛 Troubleshooting

### Error: "Can't reach database server"

- Pastikan connection string benar
- Pastikan database di Neon.tech sudah aktif
- Cek firewall/network settings

### Error: "Migration failed"

- Pastikan schema.prisma valid
- Cek apakah ada migration yang conflict
- Gunakan `db:push` untuk development jika migration bermasalah

### Error: "Prisma Client not generated"

- Jalankan `npm run db:generate`
- Pastikan `prisma/schema.prisma` ada dan valid

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon.tech Documentation](https://neon.tech/docs)
- [Database Schema Documentation](../architecture/database-schema.md)
- [Blueprint Database Schema](../../blueprint.md)

---

**Next Steps:**
Setelah database setup selesai, lanjutkan ke:
- [Authentication Setup](../development/getting-started.md)
- [UI Framework Integration](../development/getting-started.md)
