# Vercel Deployment

Panduan deployment Laundry SaaS Platform ke Vercel.

## 🚀 Quick Deploy

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Import project in Vercel
3. Connect GitHub repository
4. Vercel will auto-deploy on push

## ⚙️ Configuration

### Build Settings

Vercel will auto-detect Next.js, but you can configure:

```json
// vercel.json (optional)
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## 🔄 Deployment Process

1. **Build** - Vercel runs `npm run build`
2. **Test** - Runs build checks
3. **Deploy** - Deploys to edge network
4. **Verify** - Check deployment status

## 📊 Post-Deployment

### Verify Deployment

1. Check deployment URL
2. Test critical flows
3. Check logs in Vercel dashboard
4. Monitor performance

### Database Migrations

```bash
# Run migrations after deployment
npx prisma migrate deploy
```

## 🔍 Monitoring

### Vercel Analytics

- Enable in Vercel Dashboard
- View real-time metrics
- Monitor performance

### Logs

```bash
# View logs via CLI
vercel logs

# Or view in dashboard
# Vercel Dashboard → Deployments → View Logs
```

## 🐛 Troubleshooting

### Build Fails

- Check build logs
- Verify environment variables
- Check TypeScript errors
- Verify dependencies

### Runtime Errors

- Check function logs
- Verify database connection
- Check API routes
- Verify environment variables

## 📚 References

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://nextjs.org/docs/deployment)
