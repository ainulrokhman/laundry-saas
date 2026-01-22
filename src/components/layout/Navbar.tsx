"use client";

import { SessionUser } from "@/types/auth";
import { Role } from "@/types/enums/Role";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";

interface NavbarProps {
  user: SessionUser;
}

/**
 * Navbar component following AdminLTE 4 structure
 * Structure: app-header > navbar > container-fluid > navbar-nav
 */
export function Navbar({ user }: NavbarProps) {
  const getRoleBadgeColor = (role: Role): string => {
    switch (role) {
      case Role.SUPERADMIN:
        return "danger";
      case Role.OWNER:
        return "primary";
      case Role.STAFF:
        return "info";
      default:
        return "secondary";
    }
  };

  return (
    <nav className="app-header navbar navbar-expand bg-body">
      <div className="container-fluid">
        {/* Left Navbar Links */}
        <ul className="navbar-nav">
          <li className="nav-item">
            <a
              className="nav-link"
              data-lte-toggle="sidebar"
              href="#"
              role="button"
              aria-label="Toggle sidebar"
            >
              <i className="fas fa-bars"></i>
            </a>
          </li>
        </ul>

        {/* Right Navbar Links */}
        <ul className="navbar-nav ms-auto">
          {/* Theme Toggle */}
          <li className="nav-item">
            <ThemeToggle />
          </li>

          {/* Fullscreen Toggle */}
          <li className="nav-item d-none d-md-block">
            <a
              className="nav-link"
              data-lte-toggle="fullscreen"
              href="#"
              role="button"
              aria-label="Toggle fullscreen"
            >
              <i className="fas fa-expand-arrows-alt"></i>
            </a>
          </li>

          {/* User Dropdown Menu */}
          <li className="nav-item dropdown">
            <a
              className="nav-link"
              data-bs-toggle="dropdown"
              href="#"
              role="button"
              aria-expanded="false"
              aria-label="User menu"
            >
              <div className="d-flex align-items-center">
                <div className="user-image me-2">
                  <i className="fas fa-user-circle fa-2x text-body-secondary"></i>
                </div>
                <div className="d-none d-md-block text-start">
                  <span className="d-block fw-semibold">{user.name}</span>
                  <small className="text-muted d-block">
                    <span
                      className={`badge badge-${getRoleBadgeColor(user.role as Role)} badge-sm`}
                    >
                      {user.role}
                    </span>
                  </small>
                </div>
                <i className="fas fa-chevron-down ms-2 d-none d-md-block"></i>
              </div>
            </a>
            <ul className="dropdown-menu dropdown-menu-lg dropdown-menu-end">
              {/* User Info Header */}
              <li className="dropdown-header">
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <i className="fas fa-user-circle fa-3x text-body-secondary"></i>
                  </div>
                  <div>
                    <div className="fw-semibold">{user.name}</div>
                    <small className="text-muted">{user.email}</small>
                    <div className="mt-1">
                      <span
                        className={`badge badge-${getRoleBadgeColor(user.role as Role)} badge-sm`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>

              {/* Menu Items */}
              <li>
                <Link href="/dashboard/profile" className="dropdown-item">
                  <i className="fas fa-user me-2"></i> My Profile
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings" className="dropdown-item">
                  <i className="fas fa-cog me-2"></i> Settings
                </Link>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <button
                  className="dropdown-item dropdown-footer"
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                >
                  <i className="fas fa-sign-out-alt me-2"></i> Sign Out
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </nav>
  );
}
