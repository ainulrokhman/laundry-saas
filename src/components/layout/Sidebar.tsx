"use client";

import { Role } from "@/types/enums/Role";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  role: Role;
}

interface MenuItem {
  title: string;
  icon: string;
  path: string;
  roles: Role[]; // Roles that can access this menu
}

/**
 * Sidebar navigation component
 * Role-based menu items based on user role
 */
export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  // Menu items based on role
  const menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      icon: "fas fa-tachometer-alt",
      path: "/dashboard",
      roles: [Role.SUPERADMIN, Role.OWNER, Role.STAFF],
    },
    {
      title: "Orders",
      icon: "fas fa-shopping-cart",
      path: "/dashboard/orders",
      roles: [Role.SUPERADMIN, Role.OWNER, Role.STAFF],
    },
    {
      title: "Services",
      icon: "fas fa-concierge-bell",
      path: "/dashboard/services",
      roles: [Role.SUPERADMIN, Role.OWNER],
    },
    {
      title: "Outlets",
      icon: "fas fa-store",
      path: "/dashboard/outlets",
      roles: [Role.SUPERADMIN],
    },
    {
      title: "Users",
      icon: "fas fa-users",
      path: "/dashboard/users",
      roles: [Role.SUPERADMIN, Role.OWNER],
    },
    {
      title: "Settings",
      icon: "fas fa-cog",
      path: "/dashboard/settings",
      roles: [Role.SUPERADMIN, Role.OWNER],
    },
    {
      title: "Test Upload",
      icon: "fas fa-upload",
      path: "/dashboard/test-upload",
      roles: [Role.SUPERADMIN, Role.OWNER, Role.STAFF],
    },
  ];

  // Filter menu items based on user role
  const accessibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
      {/* Sidebar Brand */}
      <div className="sidebar-brand">
        <Link href="/dashboard" className="brand-link">
          <span className="brand-text fw-light">Laundry SaaS</span>
        </Link>
      </div>

      {/* Sidebar Wrapper */}
      <div className="sidebar-wrapper">
        <nav className="mt-2">
          <ul
            className="nav sidebar-menu flex-column"
            data-lte-toggle="treeview"
            role="navigation"
            aria-label="Main navigation"
            data-accordion="false"
          >
            {accessibleMenuItems.map((item) => {
              const isActive =
                pathname === item.path ||
                pathname.startsWith(item.path + "/");
              return (
                <li key={item.path} className="nav-item">
                  <Link
                    href={item.path}
                    className={`nav-link ${isActive ? "active" : ""}`}
                  >
                    <i className={`nav-icon ${item.icon}`}></i>
                    <p>{item.title}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
