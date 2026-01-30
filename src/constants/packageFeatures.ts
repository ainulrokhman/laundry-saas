/**
 * Package Feature Constants
 *
 * Defines all available features and package configurations for the subscription system.
 */

export enum PackageFeature {
  // POS & Orders
  BASIC_POS = "BASIC_POS",
  ORDER_MANAGEMENT = "ORDER_MANAGEMENT",

  // Invoices
  INVOICE_WATERMARK = "INVOICE_WATERMARK", // Nota dengan iklan
  INVOICE_CUSTOM = "INVOICE_CUSTOM", // Nota bersih logo toko (Custom Branding)

  // Customers
  CUSTOMER_LIMIT_100 = "CUSTOMER_LIMIT_100",
  CUSTOMER_UNLIMITED = "CUSTOMER_UNLIMITED",
  CRM_BASIC = "CRM_BASIC",
  CRM_ADVANCED = "CRM_ADVANCED",

  // Notifications
  WA_MANUAL = "WA_MANUAL", // Redirect type
  WA_AUTOMATIC = "WA_AUTOMATIC", // Server type

  // Reports
  REPORT_BASIC = "REPORT_BASIC", // Omzet Harian
  REPORT_SIMPLE_PL = "REPORT_SIMPLE_PL", // Laba Rugi Simpel
  REPORT_COMPLETE_PL = "REPORT_COMPLETE_PL", // Laba Rugi Lengkap
  REPORT_CONSOLIDATED = "REPORT_CONSOLIDATED", // Laba Rugi Gabungan
  EXPORT_DATA = "EXPORT_DATA",

  // Inventory
  STOCK_BASIC = "STOCK_BASIC", // Sabun/Parfum
  STOCK_TRANSFER = "STOCK_TRANSFER", // Transfer Stok

  // Security & Logs
  LOG_ACTIVITY = "LOG_ACTIVITY", // Anti maling / Log hapus edit

  // Payroll
  PAYROLL_AUTO = "PAYROLL_AUTO",

  // Advanced
  MULTI_OUTLET = "MULTI_OUTLET",
  PRIORITY_SUPPORT = "PRIORITY_SUPPORT",
}

export const FEATURE_LABELS: Record<PackageFeature, string> = {
  [PackageFeature.BASIC_POS]: "Point of Sale (POS)",
  [PackageFeature.ORDER_MANAGEMENT]: "Manajemen Pesanan",
  [PackageFeature.INVOICE_WATERMARK]: "Nota Digital (Watermark Iklan)",
  [PackageFeature.INVOICE_CUSTOM]: "Nota Bersih (Logo Toko)",
  [PackageFeature.CUSTOMER_LIMIT_100]: "Data Pelanggan (Max 100)",
  [PackageFeature.CUSTOMER_UNLIMITED]: "Data Pelanggan (Unlimited)",
  [PackageFeature.CRM_BASIC]: "CRM Dasar",
  [PackageFeature.CRM_ADVANCED]: "CRM Lanjutan",
  [PackageFeature.WA_MANUAL]: "Notifikasi WA (Manual/Redirect)",
  [PackageFeature.WA_AUTOMATIC]: "Notifikasi WA (Otomatis)",
  [PackageFeature.REPORT_BASIC]: "Laporan Omzet Harian",
  [PackageFeature.REPORT_SIMPLE_PL]: "Laporan Laba Rugi Simpel",
  [PackageFeature.REPORT_COMPLETE_PL]: "Laporan Laba Rugi Lengkap",
  [PackageFeature.REPORT_CONSOLIDATED]: "Laporan Laba Rugi Gabungan",
  [PackageFeature.EXPORT_DATA]: "Export Data (Excel/PDF)",
  [PackageFeature.STOCK_BASIC]: "Manajemen Stok (Sabun/Parfum)",
  [PackageFeature.STOCK_TRANSFER]: "Transfer Stok Antar Outlet",
  [PackageFeature.LOG_ACTIVITY]: "Log Aktivitas (Anti-Maling)",
  [PackageFeature.PAYROLL_AUTO]: "Sistem Gaji & Komisi Otomatis",
  [PackageFeature.MULTI_OUTLET]: "Multi-Outlet Management",
  [PackageFeature.PRIORITY_SUPPORT]: "Priority Support",
};

export interface PackageDefinition {
  name: string;
  slug: string;
  price: number;
  description: string;
  features: PackageFeature[];
  maxStaff: number; // -1 for unlimited
  maxOutlets: number; // -1 for unlimited
  sortOrder: number;
}

export const PACKAGE_DEFINITIONS: Record<string, PackageDefinition> = {
  KUCEK: {
    name: "Paket Kucek",
    slug: "kucek",
    price: 0,
    description:
      "Mulai usaha laundry tanpa biaya, fitur dasar cukup untuk operasional harian.",
    features: [
      PackageFeature.BASIC_POS,
      PackageFeature.ORDER_MANAGEMENT,
      PackageFeature.INVOICE_WATERMARK,
      PackageFeature.WA_MANUAL,
      PackageFeature.REPORT_BASIC,
      PackageFeature.CUSTOMER_LIMIT_100,
    ],
    maxStaff: 1, // Owner saja
    maxOutlets: 1,
    sortOrder: 0,
  },
  BERSIH: {
    name: "Paket Bersih",
    slug: "bersih",
    price: 49000,
    description:
      "Fitur lebih bersih tanpa iklan di nota, manajemen stok dasar, dan laporan lebih detail.",
    features: [
      PackageFeature.BASIC_POS,
      PackageFeature.ORDER_MANAGEMENT,
      PackageFeature.INVOICE_CUSTOM, // Bersih (Logo Toko)
      PackageFeature.WA_MANUAL,
      PackageFeature.REPORT_BASIC,
      PackageFeature.REPORT_SIMPLE_PL,
      PackageFeature.STOCK_BASIC,
      PackageFeature.CUSTOMER_UNLIMITED,
      PackageFeature.CRM_BASIC,
      PackageFeature.EXPORT_DATA,
    ],
    maxStaff: 3, // Owner + 2 Staff
    maxOutlets: 1,
    sortOrder: 1,
  },
  WANGI: {
    name: "Paket Wangi",
    slug: "wangi",
    price: 99000,
    description:
      "Fitur notifikasi otomatis dan keamanan log anti-maling membuat bisnis lebih wangi.",
    features: [
      PackageFeature.BASIC_POS,
      PackageFeature.ORDER_MANAGEMENT,
      PackageFeature.INVOICE_CUSTOM,
      PackageFeature.WA_AUTOMATIC,
      PackageFeature.REPORT_BASIC,
      PackageFeature.REPORT_SIMPLE_PL,
      PackageFeature.REPORT_COMPLETE_PL,
      PackageFeature.STOCK_BASIC,
      PackageFeature.CUSTOMER_UNLIMITED,
      PackageFeature.CRM_BASIC,
      PackageFeature.LOG_ACTIVITY,
      PackageFeature.PAYROLL_AUTO,
      PackageFeature.EXPORT_DATA,
    ],
    maxStaff: 5, // Owner + 4 Staff
    maxOutlets: 3,
    sortOrder: 2,
  },
  LICIN: {
    name: "Paket Licin",
    slug: "licin",
    price: 149000,
    description:
      "Solusi manajemen lengkap untuk multi-outlet dan pertumbuhan bisnis tanpa hambatan.",
    features: [
      PackageFeature.BASIC_POS,
      PackageFeature.ORDER_MANAGEMENT,
      PackageFeature.INVOICE_CUSTOM,
      PackageFeature.WA_AUTOMATIC,
      PackageFeature.REPORT_BASIC,
      PackageFeature.REPORT_SIMPLE_PL,
      PackageFeature.REPORT_COMPLETE_PL,
      PackageFeature.REPORT_CONSOLIDATED,
      PackageFeature.STOCK_BASIC,
      PackageFeature.STOCK_TRANSFER,
      PackageFeature.CUSTOMER_UNLIMITED,
      PackageFeature.CRM_ADVANCED,
      PackageFeature.LOG_ACTIVITY,
      PackageFeature.PAYROLL_AUTO,
      PackageFeature.MULTI_OUTLET,
      PackageFeature.EXPORT_DATA,
      PackageFeature.PRIORITY_SUPPORT,
    ],
    maxStaff: -1, // Unlimited
    maxOutlets: -1,
    sortOrder: 3,
  },
};
