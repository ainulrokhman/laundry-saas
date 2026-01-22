# 💻 Development Guide

Panduan pengembangan untuk Laundry SaaS Platform.

## 📋 Daftar Isi

- [Getting Started](./getting-started.md) - Memulai development
- [Code Style Guide](./code-style.md) - Panduan style code
- [Git Workflow](./git-workflow.md) - Workflow Git
- [Testing Guide](./testing.md) - Panduan testing
- [Debugging](./debugging.md) - Tips debugging
- [Common Patterns](./common-patterns.md) - Pola umum yang digunakan

## 🚀 Quick Start

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd laundry-saas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
laundry-saas/
├── app/              # Next.js App Router
│   ├── api/         # API routes
│   └── (routes)/    # Page routes
├── src/
│   ├── repositories/  # Data access layer
│   ├── services/      # Business logic layer
│   ├── controllers/   # API handlers
│   ├── components/    # UI components
│   ├── types/         # TypeScript types
│   └── lib/           # Utilities
├── docs/              # Documentation
└── public/            # Static assets
```

## 🛠️ Development Tools

- **TypeScript** - Type safety
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Prisma** - Database ORM
- **Zod** - Schema validation

## 📝 Code Standards

- Follow SOLID principles
- Write TypeScript (no `any` types)
- Use ESLint and Prettier
- Write tests for critical paths
- Document complex logic

## 🔗 Links

- [Architecture Documentation](../architecture/README.md)
- [API Documentation](../api/README.md)
- [Setup Guide](../setup/README.md)
