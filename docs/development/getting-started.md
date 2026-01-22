# Getting Started

Panduan untuk memulai development Laundry SaaS Platform.

## 📋 Prerequisites

- Node.js 18+ 
- npm atau yarn
- PostgreSQL database (atau Neon.tech account)
- Git

## 🚀 Setup Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd laundry-saas
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy `.env.example` ke `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` dengan konfigurasi Anda:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

### 5. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## 🧪 Verify Installation

1. Check TypeScript compilation:
   ```bash
   npm run build
   ```

2. Check linting:
   ```bash
   npm run lint
   ```

3. Check formatting:
   ```bash
   npm run format:check
   ```

## 📚 Next Steps

- Baca [Code Style Guide](./code-style.md)
- Pelajari [Architecture Overview](../architecture/overview.md)
- Lihat [API Documentation](../api/README.md)

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000
```

### Database Connection Error

- Pastikan PostgreSQL running
- Check `DATABASE_URL` di `.env.local`
- Verify database credentials

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```
