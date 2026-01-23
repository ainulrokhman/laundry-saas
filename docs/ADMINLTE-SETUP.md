# AdminLTE Setup Guide

## Overview

AdminLTE v4 (Bootstrap 5) telah diintegrasikan ke dalam project dengan menggunakan local assets (bukan CDN).

## File Structure

```
src/
├── components/
│   └── adminlte/
│       ├── DashboardLayout.tsx    # Main layout component
│       └── AdminLTEProvider.tsx    # Client component untuk load JS
└── app/
    └── dashboard/
        └── layout.tsx             # Dashboard layout wrapper

public/
└── js/
    ├── bootstrap.bundle.min.js   # Bootstrap JS (copied from node_modules)
    └── adminlte.min.js            # AdminLTE JS (copied from node_modules)
```

## Setup

### 1. Copy Assets

Setelah `npm install`, jalankan script untuk copy JS files:

```bash
npm run copy:adminlte
```

Script ini akan otomatis dijalankan setelah `npm install` (via `postinstall` hook).

### 2. Usage

Layout sudah otomatis diterapkan untuk semua halaman di `/dashboard/*` melalui `app/dashboard/layout.tsx`.

Untuk menggunakan layout di halaman lain:

```tsx
import { DashboardLayout } from '@/components/adminlte/DashboardLayout';
import { AdminLTEProvider } from '@/components/adminlte/AdminLTEProvider';

export default function MyPage() {
  return (
    <AdminLTEProvider>
      <DashboardLayout>
        {/* Your page content */}
      </DashboardLayout>
    </AdminLTEProvider>
  );
}
```

## Features

### Role-Based Menu

Menu items difilter berdasarkan user role:
- **SUPERADMIN**: Semua menu termasuk admin pages (Outlets, Users)
- **OWNER**: Dashboard, Orders, Services, Customers, Transactions, Reports, Settings
- **STAFF**: Dashboard, Orders, Customers

### Responsive Design

- Mobile sidebar toggle (hamburger menu)
- Bootstrap 5 responsive classes
- AdminLTE v4 responsive utilities

### Components

#### DashboardLayout

Main layout component dengan:
- Navbar dengan user dropdown
- Sidebar dengan role-based navigation
- Content wrapper
- Footer

#### AdminLTEProvider

Client component yang:
- Loads Bootstrap JS dari `/js/bootstrap.bundle.min.js`
- Loads AdminLTE JS dari `/js/adminlte.min.js`
- Menggunakan Next.js Script component dengan `strategy="afterInteractive"`

## Customization

### Adding Menu Items

Edit `src/components/adminlte/DashboardLayout.tsx`:

```tsx
const menuItems: MenuItem[] = [
  // ... existing items
  {
    label: 'New Menu',
    icon: 'fas fa-icon-name',
    href: '/dashboard/new-menu',
    roles: [Role.OWNER, Role.STAFF],
  },
];
```

### Styling

CSS sudah diimport di `src/app/globals.css`:
- Bootstrap 5 CSS
- FontAwesome CSS
- AdminLTE v4 CSS

Gunakan Bootstrap 5 classes untuk styling, bukan Tailwind (untuk AdminLTE components).

## Testing

Tests tersedia di `__tests__/adminlte/DashboardLayout.test.tsx`:
- Layout structure rendering
- Role-based menu filtering
- Active menu item highlighting
- User information display

## Notes

- **Tidak menggunakan CDN**: Semua assets di-load dari local files
- **Bootstrap 5**: Menggunakan Bootstrap 5 (bukan Bootstrap 4)
- **FontAwesome**: Icons menggunakan FontAwesome (sudah diimport di globals.css)
- **Client Component**: AdminLTEProvider harus client component karena menggunakan hooks
