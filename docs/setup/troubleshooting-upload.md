# Troubleshooting Image Upload

Panduan troubleshooting untuk masalah upload gambar ke Cloudinary.

## 🔍 Common Errors & Solutions

### Error: "Cloudinary configuration is missing"

**Penyebab:** Environment variables tidak ter-set atau tidak terbaca.

**Solusi:**
1. Pastikan file `.env.local` ada di root project
2. Pastikan isi dengan benar:
   ```env
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```
3. **Restart dev server** setelah mengubah `.env.local`:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```
4. Pastikan tidak ada spasi atau tanda kutip yang salah
5. Pastikan tidak ada karakter khusus yang tidak perlu

**Verifikasi:**
```bash
# Di terminal, jalankan:
node -e "require('dotenv').config({path: '.env.local'}); console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);"
```

### Error: "Cloudinary authentication failed" atau "401"

**Penyebab:** API Key atau API Secret salah.

**Solusi:**
1. Login ke [Cloudinary Dashboard](https://cloudinary.com/console)
2. Copy ulang credentials:
   - **Cloud Name**: Di bagian "Account Details"
   - **API Key**: Di bagian "Account Details"
   - **API Secret**: Klik "Reveal" untuk melihat secret
3. Update `.env.local` dengan credentials yang benar
4. Restart dev server

### Error: "Cloudinary cloud name not found" atau "404"

**Penyebab:** Cloud name salah atau tidak ada.

**Solusi:**
1. Pastikan cloud name benar (case-sensitive)
2. Login ke Cloudinary Dashboard dan verifikasi cloud name
3. Pastikan tidak ada typo di `.env.local`

### Error: "File size exceeds limit"

**Penyebab:** File terlalu besar.

**Solusi:**
1. Default max size adalah 5MB
2. Gunakan file yang lebih kecil
3. Atau ubah `maxFileSize` di upload options:
   ```typescript
   <ImageUpload
     maxFileSize={10 * 1024 * 1024} // 10MB
   />
   ```

### Error: "File type not allowed"

**Penyebab:** Format file tidak didukung.

**Solusi:**
1. Format yang didukung: JPEG, JPG, PNG, WEBP
2. Convert file ke format yang didukung
3. Atau tambahkan format di `allowedFormats`:
   ```typescript
   <ImageUpload
     allowedFormats={["image/jpeg", "image/png", "image/webp", "image/gif"]}
   />
   ```

### Error: "Unknown error"

**Penyebab:** Error tidak ter-catch dengan benar.

**Solusi:**
1. Check console log untuk error details
2. Pastikan environment variables sudah benar
3. Pastikan Cloudinary account aktif
4. Check network connection
5. Coba dengan file yang berbeda

## 🧪 Debugging Steps

### Step 1: Verify Environment Variables

Buat file test: `test-env.js` di root project:

```javascript
require('dotenv').config({ path: '.env.local' });

console.log('=== Environment Variables ===');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  console.log('Cloud Name Value:', process.env.CLOUDINARY_CLOUD_NAME);
}
```

Jalankan:
```bash
node test-env.js
```

### Step 2: Test Cloudinary Connection

Buat file test: `test-cloudinary.js`:

```javascript
require('dotenv').config({ path: '.env.local' });
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test connection
cloudinary.api.ping()
  .then(result => {
    console.log('✅ Cloudinary connection successful!');
    console.log('Status:', result.status);
  })
  .catch(error => {
    console.error('❌ Cloudinary connection failed!');
    console.error('Error:', error.message);
  });
```

Jalankan:
```bash
node test-cloudinary.js
```

### Step 3: Check Server Logs

Saat upload, perhatikan console log di terminal dev server. Error details akan muncul di sana.

### Step 4: Test dengan cURL

Test langsung ke Cloudinary API:

```bash
curl -X POST \
  https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload \
  -F "file=@/path/to/test-image.jpg" \
  -F "api_key=YOUR_API_KEY" \
  -F "api_secret=YOUR_API_SECRET" \
  -F "folder=test"
```

Jika ini berhasil, berarti credentials benar dan masalahnya di kode aplikasi.

## ✅ Checklist

- [ ] `.env.local` file exists
- [ ] Environment variables diisi dengan benar
- [ ] Tidak ada spasi atau karakter khusus yang tidak perlu
- [ ] Dev server sudah di-restart setelah mengubah `.env.local`
- [ ] Cloudinary account aktif
- [ ] API Key dan Secret benar
- [ ] Cloud Name benar (case-sensitive)
- [ ] File size < 5MB (atau sesuai limit)
- [ ] File format didukung (JPEG, PNG, WEBP)
- [ ] Sudah login ke aplikasi (untuk API endpoint)

## 🔗 Useful Links

- [Cloudinary Dashboard](https://cloudinary.com/console)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)

## 📞 Still Having Issues?

Jika masih ada masalah:

1. Check error message lengkap di browser console
2. Check server logs di terminal
3. Test dengan file kecil (< 1MB)
4. Test dengan format JPEG (paling kompatibel)
5. Verifikasi credentials di Cloudinary Dashboard
6. Pastikan tidak ada firewall atau proxy yang memblokir request
