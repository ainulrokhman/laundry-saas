/**
 * AdminLTE Dashboard Layout Component
 * 
 * Provides the main layout structure for dashboard pages with:
 * - Sidebar navigation (role-based menu)
 * - Top navbar with user info
 * - Footer
 * - Responsive design with mobile sidebar toggle
 * 
 * Structure follows AdminLTE v4 official layout pattern
 */

'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { Role } from '@/generated/prisma';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface MenuChildItem {
  label: string;
  icon: string;
  href: string;
  roles: Role[];
}

interface MenuItem {
  label: string;
  icon: string;
  href: string;
  roles: Role[];
  children?: MenuChildItem[];
}

/**
 * Menu items based on user role
 */
const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'fas fa-tachometer-alt',
    href: '/dashboard',
    roles: [Role.OWNER, Role.STAFF],
  },
  {
    label: 'Orders',
    icon: 'fas fa-shopping-cart',
    href: '/dashboard/orders',
    roles: [Role.SUPERADMIN, Role.OWNER, Role.STAFF],
  },
  {
    label: 'Layanan',
    icon: 'fas fa-concierge-bell',
    href: '/dashboard/services',
    roles: [Role.OWNER],
  },
  {
    label: 'Customers',
    icon: 'fas fa-users',
    href: '/dashboard/customers',
    roles: [Role.SUPERADMIN, Role.OWNER, Role.STAFF],
  },
  {
    label: 'Transactions',
    icon: 'fas fa-money-bill-wave',
    href: '/dashboard/transactions',
    roles: [Role.SUPERADMIN, Role.OWNER],
  },
  {
    label: 'Pengeluaran',
    icon: 'fas fa-file-invoice-dollar',
    href: '/dashboard/expenses',
    roles: [Role.OWNER, Role.SUPERADMIN],
  },
  {
    label: 'Reports',
    icon: 'fas fa-chart-bar',
    href: '/dashboard/reports',
    roles: [Role.SUPERADMIN, Role.OWNER],
  },
  {
    label: 'Settings',
    icon: 'fas fa-cog',
    href: '/dashboard/settings',
    roles: [Role.OWNER, Role.STAFF],
    children: [
      {
        label: 'Ubah PIN',
        icon: 'fas fa-key',
        href: '/dashboard/settings/change-pin',
        roles: [Role.OWNER, Role.STAFF],
      },
      {
        label: 'Manajemen Staff',
        icon: 'fas fa-users',
        href: '/dashboard/settings/staff',
        roles: [Role.OWNER],
      },
      {
        label: 'Rekening Bank',
        icon: 'fas fa-university',
        href: '/dashboard/settings/bank-accounts',
        roles: [Role.OWNER],
      },
      {
        label: 'Landing Page Outlet',
        icon: 'fas fa-store',
        href: '/dashboard/settings/landing-page',
        roles: [Role.OWNER],
      },
    ],
  },
  {
    label: 'Outlets',
    icon: 'fas fa-store',
    href: '/admin/outlets',
    roles: [Role.SUPERADMIN],
  },
  {
    label: 'Users',
    icon: 'fas fa-user-shield',
    href: '/admin/users',
    roles: [Role.SUPERADMIN],
  },
  {
    label: 'Verifikasi Pembayaran',
    icon: 'fas fa-money-check-alt',
    href: '/admin/payments',
    roles: [Role.SUPERADMIN],
  },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const user = session?.user as any;
  const userRole = user?.role as Role | undefined;

  const activeOutletId = (user?.outletId as string | null | undefined) ?? null;

  type OwnedOutlet = { id: string; name: string };
  const [ownedOutlets, setOwnedOutlets] = useState<OwnedOutlet[]>([]);
  const [outletsLoading, setOutletsLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [openTreeview, setOpenTreeview] = useState<string | null>(null);

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) =>
    userRole ? item.roles.includes(userRole) : false
  );

  const normalizePath = (path: string | null | undefined) => {
    const raw = (path ?? '').split('?')[0]?.split('#')[0] ?? '';
    if (!raw) return '';
    if (raw.length > 1 && raw.endsWith('/')) {
      return raw.slice(0, -1);
    }
    return raw;
  };

  // Check if a menu item is active
  const isActive = (href: string) => {
    const current = normalizePath(pathname);
    const target = normalizePath(href);

    if (!current || !target) return false;

    // Special-case: Dashboard should be active only on exact match
    if (target === '/dashboard') {
      return current === '/dashboard';
    }

    return current === target || current.startsWith(`${target}/`);
  };

  const showOutletSwitcher = useMemo(() => {
    return userRole === Role.OWNER;
  }, [userRole]);

  useEffect(() => {
    // AdminLTE treeview kadang menambahkan inline style (display) saat toggle.
    // Pada navigasi client-side, style inline itu bisa membuat submenu tidak mengikuti `menu-open`
    // sampai halaman di-refresh. Sinkronkan dengan cara menghapus inline style pada treeview.
    if (typeof window === 'undefined') return;

    requestAnimationFrame(() => {
      document
        .querySelectorAll('.app-sidebar .nav-treeview')
        .forEach((el) => el.removeAttribute('style'));
    });
  }, [pathname, openTreeview]);

  function closeSidebarIfMobileOpen() {
    if (typeof window === 'undefined') return;

    // AdminLTE sidebar is mainly relevant for mobile overlay behavior.
    const isMobile = window.innerWidth <= 992;
    if (!isMobile) return;

    const body = document.body;
    const appWrapper = document.querySelector('.app-wrapper');
    const hasOverlay = Boolean(document.querySelector('.sidebar-overlay'));
    const isOpen =
      body.classList.contains('sidebar-open') ||
      body.classList.contains('sidebar-show') ||
      appWrapper?.classList.contains('sidebar-open') ||
      appWrapper?.classList.contains('sidebar-show') ||
      hasOverlay;

    if (!isOpen) return;

    const adminLTE = (window as any).AdminLTE as any;
    const sidebarApi = adminLTE?.Sidebar ?? adminLTE?.sidebar;

    // Prefer official API if available (version-dependent).
    try {
      if (sidebarApi) {
        if (typeof sidebarApi.collapse === 'function') {
          sidebarApi.collapse();
          return;
        }
        if (typeof sidebarApi.hide === 'function') {
          sidebarApi.hide();
          return;
        }
        if (typeof sidebarApi.close === 'function') {
          sidebarApi.close();
          return;
        }
        if (typeof sidebarApi.toggle === 'function') {
          sidebarApi.toggle();
          return;
        }
      }
    } catch {
      // Fallback below
    }

    // Fallback: click the existing toggler (only when we know sidebar is open).
    const toggler = document.querySelector('[data-lte-toggle="sidebar"]') as
      | HTMLElement
      | null;
    if (toggler) {
      toggler.click();
      return;
    }

    // Last resort: remove common classes/overlay.
    body.classList.remove('sidebar-open', 'sidebar-show');
    appWrapper?.classList.remove('sidebar-open', 'sidebar-show');
    document.querySelector('.sidebar-overlay')?.remove();
  }

  useEffect(() => {
    let cancelled = false;

    async function loadOwnedOutlets() {
      if (!showOutletSwitcher) return;
      setOutletsLoading(true);

      try {
        const res = await fetch('/api/dashboard/outlets', { method: 'GET' });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.message || 'Gagal memuat daftar outlet');
        }

        const outlets: OwnedOutlet[] = Array.isArray(json?.data)
          ? json.data.map((o: any) => ({ id: o.id, name: o.name }))
          : [];

        if (!cancelled) {
          setOwnedOutlets(outlets);
        }
      } catch (e) {
        if (!cancelled) {
          setOwnedOutlets([]);
        }
      } finally {
        if (!cancelled) {
          setOutletsLoading(false);
        }
      }
    }

    void loadOwnedOutlets();

    return () => {
      cancelled = true;
    };
  }, [showOutletSwitcher]);

  async function handleSwitchOutlet(nextOutletId: string) {
    if (!nextOutletId || nextOutletId === activeOutletId) return;
    if (switching) return;

    setSwitching(true);
    try {
      // Server-side validation that outlet belongs to OWNER
      const validateRes = await fetch('/api/dashboard/outlet-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outletId: nextOutletId }),
      });
      const validateJson = await validateRes.json().catch(() => null);
      if (!validateRes.ok) {
        throw new Error(validateJson?.message || 'Outlet tidak valid');
      }

      // Update NextAuth session (JWT) - server will re-validate again in jwt callback
      await update({ outletId: nextOutletId } as any);

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Outlet aktif berhasil diubah.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        timer: 1500,
        timerProgressBar: true,
      });

      router.refresh();
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: e instanceof Error ? e.message : 'Gagal mengubah outlet aktif.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="app-wrapper">
      {/* Sidebar - Must be before app-main for AdminLTE structure */}
      <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
        {/* Sidebar Brand */}
        <div className="sidebar-brand">
          {/* Brand Link */}
          <Link
            href="/dashboard"
            className="brand-link"
            onClick={closeSidebarIfMobileOpen}
          >
            {/* Brand Text */}
            <span className="brand-text fw-light">Ainul Laundry</span>
            {/* End Brand Text */}
          </Link>
          {/* End Brand Link */}
        </div>
        {/* End Sidebar Brand */}

        {/* Sidebar Wrapper */}
        <div className="sidebar-wrapper">
          <nav className="mt-2">
            {/* Sidebar Menu */}
            <ul
              className="nav sidebar-menu flex-column"
              data-lte-toggle="treeview"
              role="navigation"
              aria-label="Main navigation"
              data-accordion="true"
              id="navigation"
            >
              {filteredMenuItems.map((item) => {
                const visibleChildren = item.children?.filter((child) =>
                  userRole ? child.roles.includes(userRole) : false
                );
                const hasChildren = Boolean(visibleChildren && visibleChildren.length > 0);
                const active = hasChildren
                  ? visibleChildren!.some((child) => isActive(child.href))
                  : isActive(item.href);
                const shouldMenuOpen = hasChildren
                  ? active || openTreeview === item.href
                  : active;
                return (
                  <li
                    key={item.href}
                    className={`nav-item ${shouldMenuOpen ? 'menu-open' : ''}`}
                  >
                    {hasChildren ? (
                      <>
                        <a
                          href="#"
                          className="nav-link"
                          onClick={(e) => {
                            // Biarkan AdminLTE menangani toggle treeview; cegah jump ke atas.
                            e.preventDefault();
                            // Hindari handler treeview AdminLTE agar state kita tidak "numpuk".
                            e.stopPropagation();
                            setOpenTreeview((prev) => (prev === item.href ? null : item.href));
                          }}
                        >
                          <i className={`nav-icon ${item.icon}`}></i>
                          <p>
                            {item.label}
                            <i className="nav-arrow fas fa-angle-right"></i>
                          </p>
                        </a>
                        <ul className="nav nav-treeview">
                          {visibleChildren!.map((child) => {
                            const childActive = isActive(child.href);
                            return (
                              <li key={child.href} className="nav-item">
                                <Link
                                  href={child.href}
                                  className={`nav-link ${childActive ? 'active' : ''}`}
                                  onClick={closeSidebarIfMobileOpen}
                                >
                                  <i className={`nav-icon ${child.icon}`}></i>
                                  <p>{child.label}</p>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className="nav-link"
                        onClick={closeSidebarIfMobileOpen}
                      >
                        <i className={`nav-icon ${item.icon}`}></i>
                        <p>{item.label}</p>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
            {/* End Sidebar Menu */}
          </nav>
        </div>
        {/* End Sidebar Wrapper */}
      </aside>
      {/* End Sidebar */}

      {/* Header */}
      <nav className="app-header navbar navbar-expand bg-body">
        {/* Container */}
        <div className="container-fluid">
          {/* Start Navbar Links */}
          <ul className="navbar-nav">
            <li className="nav-item">
              <a
                className="nav-link"
                data-lte-toggle="sidebar"
                href="#"
                role="button"
              >
                <i className="bi bi-list"></i>
              </a>
            </li>
          </ul>
          {/* End Start Navbar Links */}

          {/* End Navbar Links */}
          <ul className="navbar-nav ms-auto">
            {showOutletSwitcher && (
              <li className="nav-item d-flex align-items-center me-2">
                <div className="input-group input-group-sm">
                  <span className="input-group-text">
                    <i className="fas fa-store"></i>
                  </span>
                  <select
                    className="form-select form-select-sm"
                    value={activeOutletId ?? ''}
                    disabled={outletsLoading || switching || ownedOutlets.length === 0}
                    onChange={(e) => void handleSwitchOutlet(e.target.value)}
                    aria-label="Pilih outlet aktif"
                  >
                    {outletsLoading && (
                      <option value="">
                        Memuat outlet...
                      </option>
                    )}
                    {!outletsLoading && ownedOutlets.length === 0 && (
                      <option value="">
                        Tidak ada outlet
                      </option>
                    )}
                    {!outletsLoading &&
                      ownedOutlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                  </select>
                </div>
              </li>
            )}
            {/* User Dropdown Menu */}
            <li className="nav-item dropdown user-menu">
              <a
                href="#"
                className="nav-link dropdown-toggle"
                data-bs-toggle="dropdown"
              >
                <i className="bi bi-person-circle me-1"></i>
                <span className="d-none d-md-inline">
                  {user?.name || user?.phone || 'User'}
                </span>
              </a>
              <ul className="dropdown-menu dropdown-menu-lg dropdown-menu-end">
                {/* User Image */}
                <li className="user-header text-bg-primary">
                  <p>
                    {user?.name || 'User'}
                    {user?.role && (
                      <small className="d-block">
                        <span className="badge bg-light text-dark">{user.role}</span>
                      </small>
                    )}
                  </p>
                </li>
                {/* End User Image */}
                {/* Menu Body */}
                <li className="user-body">
                  {user?.phone && (
                    <div className="row">
                      <div className="col-12 text-center">
                        <small className="text-muted">
                          <i className="bi bi-telephone me-1"></i>
                          {user.phone}
                        </small>
                      </div>
                    </div>
                  )}
                </li>
                {/* End Menu Body */}
                {/* Menu Footer */}
                <li className="user-footer">
                  <Link href="/dashboard/settings" className="btn btn-default btn-flat">
                    Profile
                  </Link>
                  <a
                    href="/api/auth/signout"
                    className="btn btn-default btn-flat float-end"
                  >
                    Sign out
                  </a>
                </li>
                {/* End Menu Footer */}
              </ul>
            </li>
            {/* End User Dropdown Menu */}
          </ul>
          {/* End End Navbar Links */}
        </div>
        {/* End Container */}
      </nav>
      {/* End Header */}

      {/* App Main */}
      <main className="app-main">
        {/* App Content */}
        <div className="app-content">
          {/* Container */}
          <div className="container-fluid">{children}</div>
          {/* End Container */}
        </div>
        {/* End App Content */}
      </main>
      {/* End App Main */}

      {/* Footer */}
      <footer className="app-footer">
        {/* To the end */}
        <div className="float-end d-none d-sm-inline">Version 1.0.0</div>
        {/* End To the end */}
        {/* Copyright */}
        <strong>
          Copyright &copy; 2026&nbsp;
          <a href="https://ainullaundry.com" className="text-decoration-none">
            Ainul Laundry
          </a>
          .
        </strong>
        {' '}All rights reserved.
        {/* End Copyright */}
      </footer>
      {/* End Footer */}
    </div>
  );
}
