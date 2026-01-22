# ⚙️ Setup Guide

Panduan setup dan konfigurasi Laundry SaaS Platform.

## 📋 Daftar Isi

- [Environment Variables](./environment-variables.md) - Konfigurasi environment
- [Database Setup](./database-setup.md) - Setup database PostgreSQL
- [NextAuth Setup](./nextauth-setup.md) - Konfigurasi NextAuth.js
- [Cloudinary Setup](./cloudinary-setup.md) - Setup Cloudinary storage
- [Development Setup](./development-setup.md) - Setup development environment

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env.local
# Edit .env.local
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Run Development Server

```bash
npm run dev
```

## 📝 Required Services

1. **PostgreSQL Database** - Neon.tech (recommended) atau self-hosted
2. **NextAuth.js** - Built-in, hanya perlu konfigurasi
3. **Cloudinary** (optional) - Untuk image storage
4. **Vercel** (optional) - Untuk deployment

## 🔗 Links

- [Development Guide](../development/README.md)
- [Architecture Documentation](../architecture/README.md)
