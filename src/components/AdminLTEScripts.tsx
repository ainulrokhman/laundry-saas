"use client";

import { useEffect, useRef } from "react";

/**
 * AdminLTE Scripts Component
 * Initializes AdminLTE JavaScript functionality
 * Must be included in the layout for AdminLTE features to work
 * 
 * AdminLTE 4 uses Bootstrap 5 and requires both Bootstrap JS and AdminLTE JS
 * to be loaded for interactive features (sidebar toggle, fullscreen, dropdowns, etc.)
 * 
 * Handles re-initialization when tab becomes active again to fix all AdminLTE features
 */
export function AdminLTEScripts() {
  const adminLTEInitialized = useRef(false);
  const bootstrapInitialized = useRef(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Dynamically import and initialize AdminLTE JS
    const initAdminLTE = async () => {
      try {
        // Import Bootstrap JS (required for AdminLTE)
        if (!bootstrapInitialized.current) {
          await import("bootstrap/dist/js/bootstrap.bundle.min.js");
          bootstrapInitialized.current = true;
        }
        
        // Import AdminLTE JS
        if (!adminLTEInitialized.current) {
          await import("admin-lte/dist/js/adminlte.min.js");
          adminLTEInitialized.current = true;
        }

        // Re-initialize AdminLTE components after tab switch
        // This ensures all event listeners are re-attached
        if (typeof window !== "undefined" && (window as any).AdminLTE) {
          const AdminLTE = (window as any).AdminLTE;
          // Re-initialize all AdminLTE components
          if (typeof AdminLTE.init === "function") {
            AdminLTE.init();
          }
        }
      } catch (error) {
        console.error("Failed to initialize AdminLTE:", error);
      }
    };

    // Initialize on mount
    initAdminLTE();

    // Universal handler for all AdminLTE toggle features
    // This ensures all data-lte-toggle buttons work even after tab switching
    const handleAdminLTEToggle = (e: Event) => {
      const target = e.target as HTMLElement;
      const toggleButton = target.closest('[data-lte-toggle]');
      
      if (toggleButton) {
        const toggleType = toggleButton.getAttribute('data-lte-toggle');
        
        // Handle sidebar toggle
        if (toggleType === 'sidebar') {
          e.preventDefault();
          e.stopPropagation();
          
          const body = document.body;
          if (body.classList.contains('sidebar-collapse')) {
            body.classList.remove('sidebar-collapse');
            body.classList.add('sidebar-expand-lg');
          } else {
            body.classList.remove('sidebar-expand-lg');
            body.classList.add('sidebar-collapse');
          }
          return;
        }
        
        // Handle fullscreen toggle
        if (toggleType === 'fullscreen') {
          e.preventDefault();
          e.stopPropagation();
          
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
              console.error("Error attempting to enable fullscreen:", err);
            });
          } else {
            document.exitFullscreen().catch((err) => {
              console.error("Error attempting to exit fullscreen:", err);
            });
          }
          return;
        }
        
        // For other toggle types, try to trigger AdminLTE handler if available
        // But don't prevent default to allow AdminLTE to handle it
        if (typeof window !== "undefined" && (window as any).AdminLTE) {
          const AdminLTE = (window as any).AdminLTE;
          // Let AdminLTE handle other toggles if it's initialized
          if (adminLTEInitialized.current) {
            return; // Let AdminLTE handle it
          }
        }
      }
    };

    // Use event delegation on document to catch all toggle buttons
    // This works even if elements are re-rendered or event listeners are lost
    document.addEventListener('click', handleAdminLTEToggle, true);

    // Re-initialize when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          initAdminLTE();
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also handle focus event as fallback (for Alt+Tab scenarios)
    const handleWindowFocus = () => {
      setTimeout(() => {
        initAdminLTE();
      }, 100);
    };

    window.addEventListener("focus", handleWindowFocus);

    // Cleanup
    return () => {
      document.removeEventListener('click', handleAdminLTEToggle, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  return null;
}
