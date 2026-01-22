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
  roles: Role[];
  badge?: {
    text: string;
    color: "primary" | "success" | "warning" | "danger" | "info";
  };
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

/**
 * Sidebar component following AdminLTE 4 structure
 * Structure: app-sidebar > sidebar-brand + sidebar-wrapper > nav > sidebar-menu
 */
export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  // Menu items grouped by category
  const menuGroups: MenuGroup[] = [
    {
      title: "Main Navigation",
      items: [
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
      ],
    },
    {
      title: "Management",
      items: [
        {
          title: "Services",
          icon: "fas fa-concierge-bell",
          path: "/dashboard/services",
          roles: [Role.SUPERADMIN, Role.OWNER],
        },
        {
          title: "Users",
          icon: "fas fa-users",
          path: "/dashboard/users",
          roles: [Role.SUPERADMIN, Role.OWNER],
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          title: "Outlets",
          icon: "fas fa-store",
          path: "/dashboard/outlets",
          roles: [Role.SUPERADMIN],
        },
        {
          title: "Settings",
          icon: "fas fa-cog",
          path: "/dashboard/settings",
          roles: [Role.SUPERADMIN, Role.OWNER],
        },
      ],
    },
  ];

  // Filter menu items based on user role
  const filteredGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

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
          <ul className="nav sidebar-menu flex-column" role="menu">
            {filteredGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Menu Group Header */}
                {filteredGroups.length > 1 && (
                  <li className="nav-header text-uppercase text-muted">
                    {group.title}
                  </li>
                )}

                {/* Menu Items */}
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.path ||
                    pathname.startsWith(item.path + "/");
                  return (
                    <li key={item.path} className="nav-item">
                      <Link
                        href={item.path}
                        className={`nav-link ${isActive ? "active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <i className={`nav-icon ${item.icon}`}></i>
                        <p>
                          {item.title}
                          {item.badge && (
                            <span
                              className={`badge badge-${item.badge.color} right`}
                            >
                              {item.badge.text}
                            </span>
                          )}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </div>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
