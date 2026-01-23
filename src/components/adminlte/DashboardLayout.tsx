/**
 * AdminLTE Dashboard Layout Component
 * 
 * Provides the main layout structure for dashboard pages with:
 * - Sidebar navigation (role-based menu)
 * - Top navbar with user info
 * - Footer
 * - Responsive design with mobile sidebar toggle
 */

'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@/generated/prisma';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  label: string;
  icon: string;
  href: string;
  roles: Role[];
}

/**
 * Menu items based on user role
 */
const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'fas fa-tachometer-alt',
    href: '/dashboard',
    roles: [Role.OWNER, Role.STAFF], // Dashboard is outlet-specific, SUPERADMIN should use admin panel
  },
  {
    label: 'Orders',
    icon: 'fas fa-shopping-cart',
    href: '/dashboard/orders',
    roles: [Role.SUPERADMIN, Role.OWNER, Role.STAFF],
  },
  {
    label: 'Services',
    icon: 'fas fa-concierge-bell',
    href: '/dashboard/services',
    roles: [Role.SUPERADMIN, Role.OWNER],
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
    label: 'Reports',
    icon: 'fas fa-chart-bar',
    href: '/dashboard/reports',
    roles: [Role.SUPERADMIN, Role.OWNER],
  },
  {
    label: 'Settings',
    icon: 'fas fa-cog',
    href: '/dashboard/settings',
    roles: [Role.SUPERADMIN, Role.OWNER],
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
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user as any;
  const userRole = user?.role as Role | undefined;

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) =>
    userRole ? item.roles.includes(userRole) : false
  );

  // Check if a menu item is active
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };

  // Initialize AdminLTE JS after component mounts
  useEffect(() => {
    // AdminLTE JS will be loaded via script tag in layout
    // This ensures the sidebar toggle works
    if (typeof window !== 'undefined') {
      // Trigger AdminLTE initialization if needed
      const sidebarToggle = document.querySelector('[data-widget="pushmenu"]');
      if (sidebarToggle) {
        // Sidebar toggle is handled by AdminLTE JS
      }
    }
  }, []);

  return (
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        {/* Left navbar links */}
        <ul className="navbar-nav">
          <li className="nav-item">
            <a
              className="nav-link"
              data-widget="pushmenu"
              href="#"
              role="button"
            >
              <i className="fas fa-bars"></i>
            </a>
          </li>
        </ul>

        {/* Right navbar links */}
        <ul className="navbar-nav ms-auto">
          {/* User Dropdown Menu */}
          <li className="nav-item dropdown">
            <a
              className="nav-link"
              data-bs-toggle="dropdown"
              href="#"
              role="button"
            >
              <i className="far fa-user"></i>
              <span className="ms-2">
                {user?.name || user?.phone || 'User'}
              </span>
              <i className="fas fa-chevron-down ms-1"></i>
            </a>
            <div className="dropdown-menu dropdown-menu-lg dropdown-menu-end">
              <div className="dropdown-item-text">
                <div className="text-muted small">
                  {user?.phone && (
                    <div>
                      <i className="fas fa-phone me-1"></i>
                      {user.phone}
                    </div>
                  )}
                  {user?.role && (
                    <div className="mt-1">
                      <span className="badge bg-info">{user.role}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <Link href="/dashboard/settings" className="dropdown-item">
                <i className="fas fa-cog me-2"></i>
                Settings
              </Link>
              <div className="dropdown-divider"></div>
              <a
                href="/api/auth/signout"
                className="dropdown-item dropdown-footer"
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                Sign Out
              </a>
            </div>
          </li>
        </ul>
      </nav>

      {/* Main Sidebar */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        {/* Brand Logo */}
        <Link href="/dashboard" className="brand-link">
          <span className="brand-text fw-light">
            Ainul Laundry
          </span>
        </Link>

        {/* Sidebar */}
        <div className="sidebar">
          {/* Sidebar user panel */}
          {user && (
            <div className="user-panel mt-3 pb-3 mb-3 d-flex">
              <div className="info">
                <a href="#" className="d-block">
                  {user.name || user.phone}
                </a>
                <span className="text-muted small">
                  {user.role && (
                    <span className="badge bg-secondary">{user.role}</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Sidebar Menu */}
          <nav className="mt-2">
            <ul
              className="nav nav-pills nav-sidebar flex-column"
              data-widget="treeview"
              role="menu"
              data-accordion="false"
            >
              {filteredMenuItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href} className="nav-item">
                    <Link
                      href={item.href}
                      className={`nav-link ${active ? 'active' : ''}`}
                    >
                      <i className={`nav-icon ${item.icon}`}></i>
                      <p>{item.label}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content Wrapper */}
      <div className="content-wrapper">
        {/* Content Header */}
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Dashboard</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-end">
                  <li className="breadcrumb-item">
                    <Link href="/dashboard">Home</Link>
                  </li>
                  <li className="breadcrumb-item active">
                    {pathname?.replace('/dashboard', '') || 'Dashboard'}
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <section className="content">
          <div className="container-fluid">{children}</div>
        </section>
      </div>

      {/* Footer */}
      <footer className="main-footer">
        <strong>
          Copyright &copy; 2026{' '}
          <a href="https://ainullaundry.com">Ainul Laundry</a>.
        </strong>
        All rights reserved.
        <div className="float-end d-none d-sm-inline-block">
          <b>Version</b> 1.0.0
        </div>
      </footer>
    </div>
  );
}
