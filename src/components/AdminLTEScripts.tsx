"use client";

import { useEffect } from "react";

/**
 * AdminLTE Scripts Component
 * Initializes AdminLTE JavaScript functionality
 * Must be included in the layout for AdminLTE features to work
 * 
 * AdminLTE 4 uses Bootstrap 5 and requires both Bootstrap JS and AdminLTE JS
 * to be loaded for interactive features (sidebar toggle, dropdowns, etc.)
 */
export function AdminLTEScripts() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Dynamically import and initialize AdminLTE JS
    const initAdminLTE = async () => {
      try {
        // Import Bootstrap JS (required for AdminLTE)
        // Bootstrap is needed for dropdowns, modals, etc.
        await import("bootstrap/dist/js/bootstrap.bundle.min.js");
        
        // Import AdminLTE JS
        // AdminLTE JS handles sidebar toggle, treeview, and other AdminLTE-specific features
        await import("admin-lte/dist/js/adminlte.min.js");
        
        // AdminLTE auto-initializes when the script loads
        // The data-lte-toggle attributes in the HTML will work automatically
      } catch (error) {
        console.error("Failed to initialize AdminLTE:", error);
      }
    };

    initAdminLTE();
  }, []);

  return null;
}
