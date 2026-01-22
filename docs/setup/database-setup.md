# Database Setup

Panduan setup database PostgreSQL untuk Laundry SaaS Platform.

## 🗄️ Database Options

### Recommended: Neon.tech

**Why Neon.tech?**
- Serverless PostgreSQL
- Singapore region (low latency)
- Free tier available
- Automatic backups
- Easy scaling

### Alternative: Self-Hosted

- Local PostgreSQL
- Docker PostgreSQL
- AWS RDS
- DigitalOcean Managed Database

## 🚀 Setup with Neon.tech

### 1. Create Account

1. Go to [Neon.tech](https://neon.tech)
2. Sign up for free account
3. Create new project
4. Select **Singapore** region

### 2. Get Connection String

```env
DATABASE_URL="postgresql://user:password@ep-xxx.singapore-postgres.render.com/dbname?sslmode=require"
```

### 3. Configure Environment

Add to `.env.local`:

```env
DATABASE_URL="your-neon-connection-string"
```

## 📦 Prisma Setup

### 1. Install Prisma

```bash
npm install prisma @prisma/client
```

### 2. Initialize Prisma

```bash
npx prisma init
```

### 3. Create Schema

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add your models here
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Run Migrations

```bash
# Create migration
npx prisma migrate dev --name init

# Apply migrations
npx prisma migrate deploy
```

## 🔍 Verify Connection

```bash
# Open Prisma Studio
npx prisma studio

# Or test connection
npx prisma db pull
```

## 📝 Database Schema

See [Database Schema Documentation](../architecture/database-schema.md) for complete schema.

## 🔄 Migration Workflow

### Development

```bash
# Create migration after schema changes
npx prisma migrate dev --name add_new_field

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Production

```bash
# Apply migrations
npx prisma migrate deploy
```

## 🧪 Seed Database

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed data here
  const outlet = await prisma.outlet.create({
    data: {
      name: "Test Outlet",
      slug: "test-outlet",
      address: "Test Address",
    },
  });

  console.log("Seeded:", outlet);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run seed:

```bash
npx prisma db seed
```

## 🔐 Security

- Use SSL connection (`sslmode=require`)
- Never commit connection strings
- Use environment variables
- Rotate credentials regularly

## 🐛 Troubleshooting

### Connection Error

- Check `DATABASE_URL` format
- Verify database is running
- Check firewall settings
- Verify credentials

### Migration Error

```bash
# Reset and retry
npx prisma migrate reset
npx prisma migrate dev
```

## 📚 References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon.tech Documentation](https://neon.tech/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
