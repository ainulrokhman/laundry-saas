# Kebijakan Retensi Data

Dokumen ini mendeskripsikan kebijakan retensi data untuk platform Laundry SaaS (Kasirlondri). Implementasi teknis (cron, script penghapusan) dapat ditambahkan terpisah sesuai kebutuhan.

## Prinsip

- Data yang diperlukan untuk operasional dan hukum disimpan sesuai kebutuhan.
- Data log/audit dapat dibatasi umur penyimpanannya untuk menghemat ruang dan mematuhi privasi.
- Data yang dihapus harus tidak dapat dipulihkan (hard delete atau overwrite).

## Rekomendasi Retensi

| Data | Rekomendasi | Catatan |
|------|-------------|--------|
| Order & transaksi outlet | Simpan selama outlet aktif | Diperlukan untuk laporan dan pajak |
| Security log (console/file) | 90 hari | Audit keamanan; bisa dialihkan ke layanan log |
| OTP codes | Hapus setelah digunakan / expiry | Sudah di-handle oleh aplikasi (expiresAt, isUsed) |
| Session / JWT | Sesuai expiry token | NextAuth session |
| Upload (bukti pembayaran, logo) | Sesuai kebijakan subscription | Bisa dihapus setelah verifikasi selesai |

## Implementasi ke Depan

- **SecurityLog ke database**: Jika model `SecurityLog` ditambahkan, pertimbangkan job berkala untuk menghapus log lebih lama dari 90 hari.
- **Backup**: Backup database secara berkala; simpan sesuai kebijakan backup (mis. 30 hari).
- **Anonimisasi**: Untuk data yang harus disimpan lama (contoh: statistik), pertimbangkan anonimisasi alih-alih menghapus.

## Compliance

Sesuaikan dengan regulasi yang berlaku (UU PDP Indonesia, GDPR jika ada pengguna EEA). Dokumen ini bersifat panduan; penyesuaian kebijakan diserahkan ke pemilik produk.
