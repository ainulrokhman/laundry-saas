# Status Implementasi Fitur Paket

Dokumen ini merangkum status implementasi dari fitur-fitur yang didefinisikan dalam `src/constants/packageFeatures.ts`.

## ✅ Sudah Diimplementasikan (Enforced)

Fitur-fitur ini sudah memiliki logika validasi di backend dan frontend untuk membatasi akses sesuai paket.

| Fitur / Limit | Scope | Implementasi |
| :--- | :--- | :--- |
| **Limit Outlet** | `maxOutlets` | Dicek saat pembuatan outlet baru (`POST /api/dashboard/outlets`). |
| **Limit Staff** | `maxStaff` | Dicek saat penambahan staff (`StaffService.createStaff`). |
| **Limit Customer** | `CUSTOMER_*` | Dicek saat pembuatan customer baru (`CustomerService.createCustomer`). <br> - Basic: Max 100 <br> - Pro: Unlimited |
| **Laporan Laba Rugi** | `REPORT_SIMPLE_PL` | Data Pengeluaran & Net Profit disembunyikan/di-nol-kan di API jika paket tidak mendukung. |
| **Laporan Gabungan** | `REPORT_CONSOLIDATED` | Akses ke API Global Reports diblokir sepenuhnya untuk paket yang tidak mendukung. |

## ⏳ Belum Diimplementasikan (Pending)

Fitur-fitur ini sudah ada di konstanta paket tetapi belum ada logika pembatasan di sistem. Saat ini fitur tersebut mungkin **terbuka untuk semua** atau **belum ada fitur terkait**.

| Kategori | Fitur Paket | Status Saat Ini |
| :--- | :--- | :--- |
| **Invoicing** | `INVOICE_WATERMARK`<br>`INVOICE_CUSTOM` | Belum ada logika di PDF/Print generator untuk menyisipkan trademark "Powered by..." atau logo custom. |
| **Integrasi WA** | `WA_MANUAL`<br>`WA_AUTOMATIC` | Service WA (`FonnteWhatsAppService`) bisa mengirim pesan, tapi belum ada batasan otomatisasi trigger (misal: Notif selesai cuci). |
| **CRM** | `CRM_BASIC`<br>`CRM_ADVANCED` | Modul Customer belum membedakan fitur basic/advanced (selain limit jumlah). |
| **Laporan** | `REPORT_COMPLETE_PL` | Belum ada pembedaan level detail laporan (misal: Rinci per kategori vs Ringkas). Saat ini `SIMPLE_PL` mencakup fitur dasar laba rugi. |
| **Inventori** | `STOCK_BASIC`<br>`STOCK_TRANSFER` | Menu stok dan transfer stok belum dibatasi oleh paket. |
| **Keamanan** | `LOG_ACTIVITY` | Belum ada sistem Audit Log yang bisa dilihat user, sehingga belum ada yang perlu dibatasi. |
| **Lainnya** | `PAYROLL_AUTO`<br>`PRIORITY_SUPPORT` | Modul penggajian belum ada. Support adalah fitur operasional non-sistem. |

## Next Steps

Prioritas pengembangan selanjutnya disarankan:
1.  **Invoicing**: Implementasi watermark pada cetak nota.
2.  **Notification**: Gating trigger notifikasi otomatis di `OrderService`.
3.  **Inventory**: Batasi akses menu Transfer Stok.
