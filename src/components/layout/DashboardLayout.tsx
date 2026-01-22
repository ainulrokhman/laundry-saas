"use client";

import { useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Role } from "@/types/enums/Role";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Main dashboard layout component using AdminLTE 4
 * Structure: app-wrapper > app-sidebar + app-main (app-header + content + app-footer)
 * Follows AdminLTE 4 best practices
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession();

  // Initialize theme on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") || "light";
      const html = document.documentElement;
      if (savedTheme === "dark") {
        html.setAttribute("data-bs-theme", "dark");
        html.classList.add("dark-mode");
      } else {
        html.setAttribute("data-bs-theme", "light");
        html.classList.remove("dark-mode");
      }
    }
  }, []);

  // Don't render dashboard layout if no session
  if (!session) {
    return <>{children}</>;
  }

  const userRole = session.role as Role;

  return (
    <div className="app-wrapper">
      {/* Sidebar - AdminLTE 4 structure */}
      <Sidebar role={userRole} />

      {/* Main Content Area */}
      <div className="app-main">
        {/* Header/Navbar */}
        <Navbar user={session.user} />

        {/* Content */}
        <div className="app-content">
          <div className="container-fluid py-4">{children}</div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
