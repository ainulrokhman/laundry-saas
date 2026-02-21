# Laundry SaaS Platform

Platform manajemen laundry berbasis web (SaaS) yang dibangun dengan **Next.js**, **Prisma ORM**, dan **PostgreSQL (Neon.tech)**.

---

## 📋 Prasyarat

Sebelum memulai instalasi, pastikan server/komputer Anda telah memiliki:

| Kebutuhan | Versi Minimum |
|---|---|
| Node.js | v18.x atau lebih baru |
| npm | v9.x atau lebih baru |
| Git | Versi terbaru |
| Akun [Neon.tech](https://neon.tech) | Database PostgreSQL |
| Akun [Fonnte](https://fonnte.com) | OTP WhatsApp |

---

## 🖥️ Instalasi Lokal (Development)

### 1. Clone Repository

```bash
git clone https://github.com/ainulrokhman/laundry-saas.git
cd laundry-saas
```

### 2. Install Dependencies

```bash
npm install
```

> Proses `postinstall` akan otomatis menyalin aset AdminLTE dan melakukan patch FontAwesome.

### 3. Konfigurasi Environment

Salin file contoh environment ke `.env.local`:

```bash
cp .env.example .env.local
```

Kemudian edit `.env.local` dan isi nilainya:

```env
# Database PostgreSQL dari Neon.tech (gunakan pooled connection)
DATABASE_URL="postgresql://user:password@ep-xxx-xxx-pooler.ap-southeast-1.aws.neon.tech/dbname?sslmode=require"

# (Opsional) Database terpisah untuk testing
TEST_DATABASE_URL="postgresql://user:password@host:5432/test_database?sslmode=require"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"   # Generate: openssl rand -base64 32

# Fonnte WhatsApp API
FONNTE_API_KEY="your-fonnte-api-key"
FONNTE_API_URL="https://api.fonnte.com"

# Cloudinary (Opsional, untuk upload gambar)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

NODE_ENV="development"
```

### 4. Setup Database

Generate Prisma client dan push schema ke database:

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema ke database (development)
npm run prisma:push
```

### 5. Seed Data Awal (Opsional)

```bash
npm run prisma:seed
```

### 6. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 🚀 Deployment ke Server Produksi (VPS / Self-Hosted)

### 1. Install PostgreSQL di VPS

> Berikut langkah untuk **Ubuntu/Debian**. Sesuaikan jika menggunakan distro lain.

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Pastikan service berjalan
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 2. Buat Database & User PostgreSQL

```bash
# Masuk ke shell PostgreSQL sebagai user postgres
sudo -u postgres psql
```

Jalankan perintah SQL berikut di dalam psql:

```sql
-- Buat user baru
CREATE USER laundry_user WITH PASSWORD 'password_anda_yang_kuat';

-- Buat database
CREATE DATABASE laundry_db OWNER laundry_user;

-- Beri hak akses penuh
GRANT ALL PRIVILEGES ON DATABASE laundry_db TO laundry_user;

-- Keluar dari psql
\q
```

### 3. (Opsional) Izinkan Koneksi dari Luar VPS

> Lewati langkah ini jika aplikasi dan database berada di **VPS yang sama** (direkomendasikan).

Edit file konfigurasi PostgreSQL:

```bash
# Cari file postgresql.conf (biasanya di /etc/postgresql/<versi>/main/)
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Ubah baris berikut:
```
# listen_addresses = 'localhost'
listen_addresses = '*'
```

Edit `pg_hba.conf` untuk mengizinkan koneksi dari IP tertentu:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Tambahkan baris ini di bagian bawah (ganti `YOUR_APP_SERVER_IP`):
```
host    laundry_db    laundry_user    YOUR_APP_SERVER_IP/32    scram-sha-256
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

Buka port firewall (jika menggunakan UFW):
```bash
sudo ufw allow from YOUR_APP_SERVER_IP to any port 5432
```

### 4. Persiapan Node.js & PM2

```bash
# Install Node.js v18+ (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 secara global
npm install -g pm2
```

### 5. Clone & Install Aplikasi

```bash
git clone https://github.com/ainulrokhman/laundry-saas.git
cd laundry-saas
npm install
```

### 6. Konfigurasi Environment Produksi

```bash
cp .env.example .env.local
nano .env.local
```

Isi dengan konfigurasi self-hosted:

```env
# Jika app & DB di VPS yang sama (localhost)
DATABASE_URL="postgresql://laundry_user:password_anda_yang_kuat@localhost:5432/laundry_db"

# Jika app & DB di server berbeda
# DATABASE_URL="postgresql://laundry_user:password_anda@IP_SERVER_DB:5432/laundry_db"

NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="strong-random-secret"   # Generate: openssl rand -base64 32
FONNTE_API_KEY="your-fonnte-api-key"
FONNTE_API_URL="https://api.fonnte.com"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
NODE_ENV="production"
```

### 7. Push Schema Database & Seed

```bash
# Sync schema Prisma ke database
npm run prisma:push

# (Opsional) Seed data demo
ALLOW_PROD_SEED=1 \
SEED_PREFIX=demo \
SEED_INCLUDE_TRANSACTIONS=1 \
SEED_USE_DEMO_PHONES=1 \
npx prisma db seed
```

### 8. Build Aplikasi

```bash
npm run build
```

Proses ini akan menjalankan `prisma generate` lalu `next build` secara otomatis.

### 9. Jalankan dengan PM2

```bash
# Jalankan aplikasi
pm2 start npm --name "laundry-saas" -- start

# Simpan konfigurasi PM2 agar tetap berjalan setelah reboot
pm2 save
pm2 startup
```

Aplikasi akan berjalan di port `3000`. Gunakan **Nginx** sebagai reverse proxy.

### 10. (Opsional) Konfigurasi Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ☁️ Deployment ke Vercel (Direkomendasikan)

Cara termudah adalah menggunakan [Vercel Platform](https://vercel.com):

1. Push repository ke GitHub/GitLab
2. Import project di [Vercel Dashboard](https://vercel.com/dashboard)
3. Tambahkan **Environment Variables** di **Settings → Environment Variables**
4. Deploy otomatis setiap push ke branch `main`

Lihat panduan lengkap di [`docs/VERCEL-ENV-SETUP.md`](docs/VERCEL-ENV-SETUP.md).

---

## 🛠️ Perintah Berguna

| Perintah | Keterangan |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk produksi |
| `npm run start` | Jalankan production server |
| `npm run lint` | Cek kode dengan ESLint |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:push` | Push schema ke database |
| `npm run prisma:migrate` | Buat dan jalankan migration |
| `npm run prisma:studio` | Buka Prisma Studio (GUI database) |
| `npm run prisma:seed` | Seed data awal |
| `npm run test` | Jalankan unit test (Vitest) |
| `npm run test:e2e` | Jalankan E2E test (Playwright) |

---

## 📚 Dokumentasi Lanjutan

- [`docs/VERCEL-ENV-SETUP.md`](docs/VERCEL-ENV-SETUP.md) — Setup environment variables di Vercel
- [`docs/PROD-SEED-RUNBOOK.md`](docs/PROD-SEED-RUNBOOK.md) — Runbook seed data ke produksi
- [`docs/SECURITY.md`](docs/SECURITY.md) — Panduan keamanan aplikasi
- [`docs/TEST-SETUP.md`](docs/TEST-SETUP.md) — Setup dan menjalankan testing
- [`blueprint.md`](blueprint.md) — Blueprint fitur dan arsitektur
