# Test Image Upload

Panduan untuk testing image upload functionality dengan Cloudinary.

## 📋 Prerequisites

1. **Environment Variables Setup**
   - Pastikan file `.env.local` sudah diisi dengan Cloudinary credentials:
   ```env
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

2. **Authentication**
   - Pastikan sudah login ke aplikasi
   - Upload endpoint memerlukan authentication

## 🧪 Cara Test

### Method 1: Via Test Page (Recommended)

1. Login ke aplikasi
2. Akses halaman: `/dashboard/test-upload`
3. Atau klik menu "Test Upload" di sidebar
4. Pilih gambar yang ingin di-upload
5. Klik "Choose File" dan pilih gambar
6. Upload akan otomatis dimulai
7. Lihat hasil di panel kanan (URL, Public ID, Preview)

**Features:**
- Preview gambar sebelum upload
- Test dengan folder berbeda (payments, outlets, test)
- Lihat hasil upload (URL, Public ID)
- Error handling

### Method 2: Via Browser Console

1. Buka browser console (F12)
2. Buat file input di HTML atau gunakan yang sudah ada
3. Jalankan script berikut:

```javascript
// Get file input element
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'test');
  formData.append('maxFileSize', '5242880'); // 5MB

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload successful:', data);
      console.log('URL:', data.data.url);
      console.log('Public ID:', data.data.public_id);
    } else {
      console.error('❌ Upload failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

fileInput.click();
```

### Method 3: Via cURL (Command Line)

```bash
# Pastikan sudah login dan dapat session token
# Ganti YOUR_SESSION_TOKEN dengan session token dari browser

curl -X POST http://localhost:3000/api/upload \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -F "file=@/path/to/your/image.jpg" \
  -F "folder=test" \
  -F "maxFileSize=5242880"
```

**Cara dapat session token:**
1. Login ke aplikasi di browser
2. Buka Developer Tools (F12)
3. Buka tab Application/Storage
4. Cari Cookies → `http://localhost:3000`
5. Copy value dari cookie `next-auth.session-token`

### Method 4: Via Postman/Insomnia

1. **Setup Request:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/upload`
   - Body Type: `form-data`

2. **Add Fields:**
   - `file`: (File) - Pilih gambar
   - `folder`: (Text) - `test` (optional)
   - `maxFileSize`: (Text) - `5242880` (optional, 5MB)

3. **Add Headers:**
   - `Cookie`: `next-auth.session-token=YOUR_SESSION_TOKEN`

4. **Send Request**

## ✅ Expected Response

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "public_id": "test/abc123xyz",
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/test/abc123xyz.jpg",
    "width": 1920,
    "height": 1080,
    "format": "jpg",
    "bytes": 245678
  }
}
```

### Error Response (400/401/500)
```json
{
  "error": "Error message here"
}
```

## 🔍 Troubleshooting

### Error: "Cloudinary configuration is missing"
**Solution:** Pastikan environment variables sudah diisi di `.env.local` dan restart dev server.

### Error: "Unauthorized"
**Solution:** Pastikan sudah login. Upload endpoint memerlukan authentication.

### Error: "File size exceeds maximum"
**Solution:** File terlalu besar. Default max size adalah 5MB. Bisa diubah via `maxFileSize` parameter.

### Error: "File type not allowed"
**Solution:** Format file tidak didukung. Format yang didukung: JPEG, JPG, PNG, WEBP.

### Upload berhasil tapi tidak muncul di Cloudinary
**Solution:** 
1. Check Cloudinary dashboard
2. Pastikan credentials benar
3. Check folder path di Cloudinary

## 📝 Test Checklist

- [ ] Environment variables sudah diisi
- [ ] Sudah login ke aplikasi
- [ ] Test upload via Test Page
- [ ] Test dengan file kecil (< 1MB)
- [ ] Test dengan file besar (> 5MB) - harus error
- [ ] Test dengan format yang tidak didukung - harus error
- [ ] Test dengan folder berbeda (payments, outlets, test)
- [ ] Verify file muncul di Cloudinary dashboard
- [ ] Test delete file (jika diperlukan)

## 🎯 Use Cases

### 1. Upload Payment Proof
```typescript
<ImageUpload
  folder="payments"
  onUploadComplete={(url, publicId) => {
    // Save to Transaction model
    // proofUrl = url
  }}
/>
```

### 2. Upload Outlet Logo
```typescript
<ImageUpload
  folder="outlets"
  onUploadComplete={(url, publicId) => {
    // Save to Outlet model
    // logoUrl = url
  }}
/>
```

### 3. Server-side Upload
```typescript
import { uploadToCloudinary } from "@/lib/cloudinary";

const result = await uploadToCloudinary(file, {
  folder: "payments",
  maxFileSize: 5 * 1024 * 1024, // 5MB
});
```

## 📚 References

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
