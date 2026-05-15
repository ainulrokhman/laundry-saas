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

import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { Role } from '@/generated/prisma';
import ChangePinModal from './ChangePinModal';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface MenuChildItem {
  label: string;
  icon: string;
  href: string;
  roles: Role[];
  scope?: 'global' | 'outlet';
}

interface MenuItem {
  label: string;
  icon: string;
  href: string;
  roles: Role[];
  children?: MenuChildItem[];
  scope?: 'global' | 'outlet'; // New property
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
    scope: 'outlet',
  },
  {
    label: 'Orders',
    icon: 'fas fa-shopping-cart',
    href: '/dashboard/orders',
    roles: [Role.OWNER, Role.STAFF],
    scope: 'outlet',
  },
  {
    label: 'Layanan',
    icon: 'fas fa-concierge-bell',
    href: '/dashboard/services',
    roles: [Role.OWNER],
    scope: 'outlet',
  },
  {
    label: 'Customers',
    icon: 'fas fa-users',
    href: '/dashboard/customers',
    roles: [Role.OWNER, Role.STAFF],
    scope: 'outlet',
  },
  // {
  //   label: 'Transactions',
  //   icon: 'fas fa-money-bill-wave',
  //   href: '/dashboard/transactions',
  //   roles: [Role.OWNER],
  //   scope: 'outlet',
  // },
  {
    label: 'Pengeluaran',
    icon: 'fas fa-file-invoice-dollar',
    href: '/dashboard/expenses',
    roles: [Role.OWNER],
    scope: 'outlet',
  },
  {
    label: 'Reports',
    icon: 'fas fa-chart-bar',
    href: '/dashboard/reports',
    roles: [Role.OWNER],
    scope: 'outlet',
  },
  {
    label: 'Settings',
    icon: 'fas fa-cog',
    href: '/dashboard/settings',
    roles: [Role.OWNER, Role.STAFF],
    children: [
      {
        label: 'Profil Saya',
        icon: 'fas fa-user-circle',
        href: '/dashboard/settings/profile',
        roles: [Role.OWNER, Role.STAFF, Role.SUPERADMIN],
      },
      {
        label: 'Manajemen Staff',
        icon: 'fas fa-users',
        href: '/dashboard/settings/staff',
        roles: [Role.OWNER],
        scope: 'outlet',
      },
      // {
      //   label: 'Rekening Bank',
      //   icon: 'fas fa-university',
      //   href: '/dashboard/settings/bank-accounts',
      //   roles: [Role.OWNER],
      //   scope: 'outlet',
      // },
      {
        label: 'Landing Page Outlet',
        icon: 'fas fa-store',
        href: '/dashboard/settings/landing-page',
        roles: [Role.OWNER],
        scope: 'outlet',
      },
      // Global Items in Settings
      {
        label: 'Manajemen Outlet',
        icon: 'fas fa-store',
        href: '/dashboard/settings/outlets',
        roles: [Role.OWNER],
        scope: 'global',
      },
      {
        label: 'Paket Langganan',
        icon: 'fas fa-gem',
        href: '/dashboard/settings/subscription',
        roles: [Role.OWNER],
        scope: 'global',
      },
    ],
  },
  // SUPERADMIN Menus
  {
    label: 'Dashboard',
    icon: 'fas fa-tachometer-alt',
    href: '/admin',
    roles: [Role.SUPERADMIN],
  },
  {
    label: 'Subscriptions',
    icon: 'fas fa-crown',
    href: '/admin/subscriptions',
    roles: [Role.SUPERADMIN],
    children: [
      {
        label: 'All Subscriptions',
        icon: 'fas fa-list',
        href: '/admin/subscriptions',
        roles: [Role.SUPERADMIN],
      },
      {
        label: 'Pending Payments',
        icon: 'fas fa-clock',
        href: '/admin/subscriptions/pending',
        roles: [Role.SUPERADMIN],
      },
      // {
      //   label: 'Bank Accounts',
      //   icon: 'fas fa-university',
      //   href: '/admin/subscriptions/bank-accounts',
      //   roles: [Role.SUPERADMIN],
      // },
    ],
  },
  {
    label: 'Packages',
    icon: 'fas fa-box',
    href: '/admin/packages',
    roles: [Role.SUPERADMIN],
  },
  // {
  //   label: 'Outlets',
  //   icon: 'fas fa-store',
  //   href: '/admin/outlets',
  //   roles: [Role.SUPERADMIN],
  // },
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
  const user = session?.user as any;
  const userRole = user?.role as Role | undefined;

  const activeOutletId = (user?.outletId as string | null | undefined) ?? null;

  type OwnedOutlet = { id: string; name: string };
  const [ownedOutlets, setOwnedOutlets] = useState<OwnedOutlet[]>([]);
  const [outletsLoading, setOutletsLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [openTreeview, setOpenTreeview] = useState<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Filter menu items based on user role
  // All menus are shown regardless of Global/Outlet mode - data fetching handles the mode
  const filteredMenuItems = menuItems
    .filter((item) => {
      // Role Check only - scope is handled by data layer
      if (!userRole || !item.roles.includes(userRole)) return false;
      return true;
    })
    .map(item => {
      // Filter children based on role only
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child => {
            return userRole ? child.roles.includes(userRole) : false;
          })
        };
      }
      return item;
    });

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
      } catch {
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
    if (nextOutletId === activeOutletId && nextOutletId !== '') return; // Allow re-selecting blank if somehow needed, but mostly avoid redundant
    if (switching) return;

    setSwitching(true);
    try {
      // If nextOutletId is empty, it means "Global Mode"
      // We don't need to validate outlet ownership for empty ID
      if (nextOutletId) {
        // Server-side validation that outlet belongs to OWNER
        const validateRes = await fetch('/api/dashboard/outlet-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outletId: nextOutletId }),
        });
        if (!validateRes.ok) {
          throw new Error('Outlet tidak valid');
        }
      }

      // Update NextAuth session (JWT)
      // If nextOutletId is empty string, the session update should handle clearing it (or set to null)
      // Note: check your auth implementation if it allows null outletId
      await update({ outletId: nextOutletId || null } as any);

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: nextOutletId ? 'Outlet aktif berhasil diubah.' : 'Masuk ke Global Dashboard.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        timer: 1000,
        timerProgressBar: true,
      });

      // Refresh the page data softly, without redirecting if possible.
      // Wait, the requirement says "tidak perlu refresh dan mengalihkan halaman".
      // So we will just let useSession's reactivity trigger any necessary UI updates.
      // We will remove router.refresh() and router.push('/dashboard').
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
            <Image
              src="/images/logo-light.png"
              alt="Kasirlondri Logo"
              width={80}
              height={80}
              className="brand-image img-circle elevation-3 p-3"
              style={{ opacity: 0.9, maxHeight: '100%' }}
            />
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
                    key={item.label}
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
                <div className="dropdown">
                  <button
                    className="btn btn-outline-secondary btn-sm dropdown-toggle d-flex align-items-center gap-2"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    disabled={outletsLoading || switching}
                  >
                    <i className="fas fa-store"></i>
                    <span className="d-none d-md-inline text-truncate" style={{ maxWidth: '150px' }}>
                      {switching ? 'Switching...' : (
                        activeOutletId
                          ? ownedOutlets.find(o => o.id === activeOutletId)?.name || 'Outlet Tidak Dikenal'
                          : 'Global Dashboard'
                      )}
                    </span>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-1">
                    <li>
                      <button
                        className={`dropdown-item py-2 d-flex align-items-center ${!activeOutletId ? 'active bg-primary text-white' : ''}`}
                        onClick={() => handleSwitchOutlet('')}
                      >
                        <i className="fas fa-globe me-2"></i> Global Dashboard
                      </button>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    {ownedOutlets.length > 0 ? (
                      ownedOutlets.map((outlet) => (
                        <li key={outlet.id}>
                          <button
                            className={`dropdown-item py-2 ${activeOutletId === outlet.id ? 'active bg-primary text-white' : ''
                              }`}
                            onClick={() => handleSwitchOutlet(outlet.id)}
                          >
                            {outlet.name}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li>
                        <span className="dropdown-item text-muted">Belum ada outlet</span>
                      </li>
                    )}
                    {/* Link to Add Outlet if needed */}
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <Link href="/dashboard/settings/outlets" className="dropdown-item text-primary fw-bold">
                        <i className="fas fa-plus me-2"></i> Kelola Outlet
                      </Link>
                    </li>
                  </ul>
                </div>
              </li>
            )}
            {/* User Dropdown Menu */}
            <li className="nav-item dropdown">
              <a
                href="#"
                className="nav-link dropdown-toggle d-flex align-items-center"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div
                  className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white me-2"
                  style={{ width: '32px', height: '32px', fontSize: '14px' }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="d-none d-md-inline fw-semibold">
                  {user?.name || user?.phone || 'User'}
                </span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg p-0 overflow-hidden" style={{ minWidth: '240px' }}>
                {/* Header */}
                <li className="p-3 bg-primary text-white text-center">
                  <div className="fw-bold fs-5">{user?.name || 'User'}</div>
                  <div className="small opacity-75 mb-1">{user?.role || 'Guest'}</div>
                  {user?.phone && (
                    <div className="small opacity-75">
                      <i className="bi bi-telephone-fill me-1" style={{ fontSize: '0.8em' }}></i>
                      {user.phone}
                    </div>
                  )}
                </li>

                {/* Menu Items */}
                <li className="py-1">
                  <Link
                    href="/dashboard/settings/profile"
                    className="dropdown-item py-2 px-3 d-flex align-items-center"
                  >
                    <i className="fas fa-user-circle me-3 text-secondary" style={{ width: '20px' }}></i>
                    <span>Profile Saya</span>
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    className="dropdown-item py-2 px-3 d-flex align-items-center w-100 text-start"
                    onClick={() => setIsPinModalOpen(true)}
                  >
                    <i className="fas fa-key me-3 text-secondary" style={{ width: '20px' }}></i>
                    <span>Ubah PIN</span>
                  </button>
                </li>

                {/* Divider */}
                <li><hr className="dropdown-divider my-1" /></li>

                {/* Logout */}
                <li className="py-1">
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      const result = await Swal.fire({
                        title: 'Apakah Anda yakin?',
                        text: "Anda akan keluar dari aplikasi.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#3085d6',
                        confirmButtonText: 'Ya, Keluar',
                        cancelButtonText: 'Batal'
                      });

                      if (result.isConfirmed) {
                        await signOut({ callbackUrl: '/login' });
                      }
                    }}
                    className="dropdown-item py-2 px-3 d-flex align-items-center text-danger"
                  >
                    <i className="fas fa-sign-out-alt me-3" style={{ width: '20px' }}></i>
                    <span>Sign Out</span>
                  </a>
                </li>
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
          <div className="container-fluid" key={activeOutletId || 'global'}>{children}</div>
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
            Kasirlondri
          </a>
          .
        </strong>
        {' '}All rights reserved.
        {/* End Copyright */}
      </footer>
      {/* End Footer */}
      {/* End Footer */}

      {/* Mobile FAB for New Order */}
      {userRole !== Role.SUPERADMIN && !pathname?.startsWith('/admin') && (
        <Link
          href="/dashboard/orders/new"
          className="btn btn-primary rounded-circle shadow-lg d-md-none d-flex align-items-center justify-content-center"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            zIndex: 1050,
            fontSize: '24px',
          }}
          aria-label="Buat Order Baru"
        >
          <i className="fas fa-cash-register"></i>
        </Link>
      )}

      <ChangePinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
      />
    </div>
  );
}
