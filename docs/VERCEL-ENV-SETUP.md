# Vercel Environment Variables Setup Guide

This guide explains how to configure environment variables for the Laundry SaaS Platform on Vercel.

## 📋 Required Environment Variables

### 1. Database Configuration

**Variable:** `DATABASE_URL`

**Description:** PostgreSQL connection string from Neon.tech

**Important:** Use the **pooled connection** string for Vercel deployment (not the direct connection).

**Format:**
```
postgresql://user:password@ep-xxx-xxx-pooler.ap-southeast-1.aws.neon.tech/dbname?sslmode=require
```

**How to get:**
1. Go to your Neon.tech dashboard
2. Select your database project
3. Go to "Connection Details"
4. Select "Pooled connection" (not "Direct connection")
5. Copy the connection string
6. Replace `[password]` with your actual password

---

### 2. NextAuth.js Configuration

**Variable:** `NEXTAUTH_URL`

**Description:** The canonical URL of your site

**Production value:**
```
https://your-domain.vercel.app
```

**Variable:** `NEXTAUTH_SECRET`

**Description:** Secret key for encrypting JWT tokens and sessions

**How to generate:**
```bash
openssl rand -base64 32
```

**Important:** Use a different secret for production than development!

---

### 3. WhatsApp Service (Fonnte API)

**Variable:** `FONNTE_API_KEY`

**Description:** API key from Fonnte for sending WhatsApp messages (OTP)

**How to get:**
1. Sign up at https://fonnte.com
2. Go to your dashboard
3. Copy your API key

**Variable:** `FONNTE_API_URL` (Optional)

**Description:** Fonnte API endpoint URL

**Default value:**
```
https://api.fonnte.com
```

**Note:** Only set this if you're using a custom Fonnte endpoint.

---

### 4. Cloudinary Configuration (Optional)

**Variables:**
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

**Description:** Cloudinary credentials for storing images (payment proofs, outlet logos, etc.)

**How to get:**
1. Sign up at https://cloudinary.com
2. Go to Dashboard
3. Copy your Cloud Name, API Key, and API Secret

**Note:** If you're not using Cloudinary, you can skip these variables. The app will work without them, but image upload features will be disabled.

---

### 5. Environment

**Variable:** `NODE_ENV`

**Description:** Environment mode

**Production value:**
```
production
```

---

## 🚀 Setting Up in Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Name:** Variable name (e.g., `DATABASE_URL`)
   - **Value:** Variable value
   - **Environment:** Select where it applies:
     - **Production** - For production deployments
     - **Preview** - For preview deployments (PRs, branches)
     - **Development** - For local development (optional, use `.env.local` instead)
4. Click **Save**
5. **Important:** After adding/updating variables, you need to redeploy:
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on the latest deployment
   - Click **Redeploy**

### Method 2: Via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login:
   ```bash
   vercel login
   ```

3. Link your project:
   ```bash
   vercel link
   ```

4. Add environment variables:
   ```bash
   # Production
   vercel env add DATABASE_URL production
   vercel env add NEXTAUTH_URL production
   vercel env add NEXTAUTH_SECRET production
   vercel env add FONNTE_API_KEY production
   vercel env add CLOUDINARY_CLOUD_NAME production
   vercel env add CLOUDINARY_API_KEY production
   vercel env add CLOUDINARY_API_SECRET production
   vercel env add NODE_ENV production
   
   # Preview (same variables, different values if needed)
   vercel env add DATABASE_URL preview
   # ... repeat for other variables
   ```

5. Pull environment variables to verify:
   ```bash
   vercel env pull .env.local
   ```

---

## ✅ Verification Checklist

Before deploying to production, ensure:

- [ ] `DATABASE_URL` uses **pooled connection** (contains `-pooler` in the hostname)
- [ ] `NEXTAUTH_URL` matches your production domain
- [ ] `NEXTAUTH_SECRET` is different from development
- [ ] `FONNTE_API_KEY` is valid and active
- [ ] `NODE_ENV` is set to `production`
- [ ] All variables are added to **Production** environment
- [ ] Redeploy after adding/updating variables

---

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use different secrets for production** - Never reuse development secrets
3. **Rotate secrets regularly** - Especially `NEXTAUTH_SECRET`
4. **Use Vercel's environment variable encryption** - Variables are encrypted at rest
5. **Limit access** - Only team members who need access should have it
6. **Monitor usage** - Check Vercel logs for any unauthorized access attempts

---

## 🐛 Troubleshooting

### Issue: Database connection fails in production

**Solution:**
- Verify `DATABASE_URL` uses pooled connection (contains `-pooler`)
- Check if database allows connections from Vercel IPs
- Verify SSL mode is set to `require`

### Issue: NextAuth session errors

**Solution:**
- Verify `NEXTAUTH_URL` matches your production domain exactly
- Ensure `NEXTAUTH_SECRET` is set and valid
- Check that both variables are in Production environment

### Issue: WhatsApp OTP not sending

**Solution:**
- Verify `FONNTE_API_KEY` is correct and active
- Check Fonnte dashboard for API usage/quota
- Verify `FONNTE_API_URL` is correct (if custom)

### Issue: Images not uploading

**Solution:**
- Verify all Cloudinary variables are set correctly
- Check Cloudinary dashboard for API usage/quota
- Verify Cloudinary account is active

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Neon.tech Connection Strings](https://neon.tech/docs/connect/connect-from-any-app)
- [NextAuth.js Environment Variables](https://next-auth.js.org/configuration/options#environment-variables)
- [Fonnte API Documentation](https://doc.fonnte.com)
