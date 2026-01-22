"use client";

import { SessionUser } from "@/types/auth";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface NavbarProps {
  user: SessionUser;
}

/**
 * Top navigation bar component
 * Includes sidebar toggle, search, notifications, and user menu
 */
export function Navbar({ user }: NavbarProps) {
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
            >
              <i className="fas fa-bars"></i>
            </a>
          </li>
        </ul>

        {/* Right Navbar Links */}
        <ul className="navbar-nav ms-auto">
          {/* User Dropdown Menu */}
          <li className="nav-item dropdown">
            <a
              className="nav-link"
              data-bs-toggle="dropdown"
              href="#"
              role="button"
            >
              <i className="fas fa-user-circle"></i>
              <span className="d-none d-md-inline ms-2">{user.name}</span>
            </a>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <Link href="/dashboard/profile" className="dropdown-item">
                  <i className="fas fa-user me-2"></i> Profile
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
                  className="dropdown-item"
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
