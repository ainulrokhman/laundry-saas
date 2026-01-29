# Roles & Permissions (RBAC)

Dokumen ini menjelaskan **fitur apa saja** yang dapat diakses setiap role di Laundry SaaS Platform.

## Ringkasan Role

| Role | Deskripsi | Subscription |
|------|-----------|--------------|
| **SUPERADMIN** | Admin platform SaaS (mengelola sistem, bukan operasional outlet) | - |
| **OWNER** | Admin outlet (tenant admin) + kelola staff outlet | **Di level User** |
| **STAFF** | Operator outlet (operasional harian) | Mengikuti OWNER |

## Model Subscription

**Subscription dikelola di level OWNER (User)**, bukan di level Outlet:

```
User (OWNER)
├── packageId → SubscriptionPackage
├── subscriptionExpiresAt
└── ownedOutlets[] → Outlet[]
```

Ini berarti:
- 1 OWNER bisa memiliki banyak outlet (multi-outlet)
- Quota outlet dibatasi oleh `package.maxOutlets`
- Quota staff dibatasi oleh `package.maxStaff`

## Cara Membaca Dokumentasi

- Setiap dokumen role fokus pada **fitur high-level**, bukan detail route/API
- Aturan teknis (multi-tenancy, outlet context, proxy auth) direferensikan dari:
  - `DEVELOPMENT-PLAN.md` (section **Role Model & Access (RBAC)**)
  - `.cursorrules`

## Dokumen Per-Role

- [`SUPERADMIN.md`](SUPERADMIN.md) - Admin platform SaaS
- [`OWNER.md`](OWNER.md) - Pemilik outlet (dengan fitur Global Reports)
- [`STAFF.md`](STAFF.md) - Operator outlet

## Backlog Terkait Akses

- **Impersonation (support, optional)**: SUPERADMIN dapat impersonate OWNER/STAFF untuk troubleshooting via admin panel, dengan strict audit/logging.
