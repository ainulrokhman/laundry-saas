"use client";

import { useSession } from "next-auth/react";
import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Role } from "@/types/enums/Role";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Main dashboard layout component using AdminLTE 4
 * Includes sidebar, navbar, and footer
 * Structure matches AdminLTE 4 layout pattern
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession();

  // Don't render dashboard layout if no session
  if (!session) {
    return <>{children}</>;
  }

  const userRole = session.role as Role;

  return (
    <div className="app-wrapper">
      {/* Sidebar - Sibling to app-main */}
      <Sidebar role={userRole} />

      {/* Main Content Area */}
      <div className="app-main">
        {/* Navbar */}
        <Navbar user={session.user} />

        {/* Content Wrapper */}
        <div className="app-content">
          <div className="container-fluid py-4">{children}</div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
