# Environment Variables

Dokumentasi environment variables untuk Laundry SaaS Platform.

## 📝 Required Variables

### Database

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

**Description**: PostgreSQL connection string  
**Example (Neon.tech)**: `postgresql://user:pass@ep-xxx.singapore-postgres.render.com/dbname?sslmode=require`

### NextAuth.js

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

**Description**:
- `NEXTAUTH_URL`: Base URL aplikasi (production: `https://yourdomain.com`)
- `NEXTAUTH_SECRET`: Secret key untuk JWT (generate dengan `openssl rand -base64 32`)

## 🔧 Optional Variables

### Cloudinary

```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

**Description**: Cloudinary credentials untuk image storage

### Supabase Storage (Alternative)

```env
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-key"
```

## 📁 File Structure

```
.env.local          # Local development (gitignored)
.env.example        # Example template (committed)
.env.production     # Production (gitignored, set in Vercel)
```

## 🔐 Security

### Never Commit

- ❌ `.env.local`
- ❌ `.env.production`
- ❌ Any file with secrets

### Always Commit

- ✅ `.env.example` (without real values)

## 🧪 Testing Environment

```env
# .env.test
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret"
```

## 📚 References

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
