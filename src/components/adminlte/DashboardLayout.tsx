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
    roles: [Role.OWNER, Role.STAFF],
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

  return (
    <div className="app-wrapper">
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

      {/* Sidebar */}
      <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
        {/* Sidebar Brand */}
        <div className="sidebar-brand">
          {/* Brand Link */}
          <Link href="/dashboard" className="brand-link">
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
              data-accordion="false"
              id="navigation"
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
            {/* End Sidebar Menu */}
          </nav>
        </div>
        {/* End Sidebar Wrapper */}
      </aside>
      {/* End Sidebar */}

      {/* App Main */}
      <main className="app-main">
        {/* App Content Header */}
        <div className="app-content-header">
          {/* Container */}
          <div className="container-fluid">
            {/* Row */}
            <div className="row">
              <div className="col-sm-6">
                <h3 className="mb-0">Dashboard</h3>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-end">
                  <li className="breadcrumb-item">
                    <Link href="/dashboard">Home</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    {pathname?.replace('/dashboard', '') || 'Dashboard'}
                  </li>
                </ol>
              </div>
            </div>
            {/* End Row */}
          </div>
          {/* End Container */}
        </div>
        {/* End App Content Header */}

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
