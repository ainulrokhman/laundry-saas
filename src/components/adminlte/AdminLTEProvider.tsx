/**
 * AdminLTE Provider Component
 * 
 * Client component that loads AdminLTE JavaScript files from local assets.
 * Must be used in a client component context.
 */

'use client';

import { useEffect } from 'react';
import Script from 'next/script';

interface AdminLTEProviderProps {
  children: React.ReactNode;
}

export function AdminLTEProvider({ children }: AdminLTEProviderProps) {
  useEffect(() => {
    // Global error handler to catch getComputedStyle errors from Bootstrap/AdminLTE
    // This must be set up BEFORE scripts are loaded to catch early initialization errors
    const errorHandler = (event: ErrorEvent) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('getComputedStyle') ||
           event.error.message.includes('not of type Element'))) {
        // Suppress this specific error - it's usually from Bootstrap/AdminLTE
        // trying to access elements before they're ready
        event.preventDefault();
        event.stopPropagation();
        console.debug('Suppressed getComputedStyle error (element not ready):', event.error);
        return false;
      }
    };

    // Also handle unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message &&
          (event.reason.message.includes('getComputedStyle') ||
           event.reason.message.includes('not of type Element'))) {
        event.preventDefault();
        console.debug('Suppressed getComputedStyle promise rejection:', event.reason);
        return false;
      }
    };

    window.addEventListener('error', errorHandler, true); // Use capture phase
    window.addEventListener('unhandledrejection', rejectionHandler);

    let retryCount = 0;
    const MAX_RETRIES = 50;
    let isInitialized = false;

    const initAdminLTE = () => {
      if (typeof window === 'undefined') return;
      if (isInitialized) return; // Prevent multiple initializations

      retryCount++;

      // Wait for DOM to be fully ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdminLTE);
        return;
      }

      // Ensure required elements exist and are in the DOM
      const appWrapper = document.querySelector('.app-wrapper');
      const sidebarWrapper = document.querySelector('.sidebar-wrapper');
      
      if (!appWrapper || !sidebarWrapper) {
        if (retryCount < MAX_RETRIES) {
          setTimeout(initAdminLTE, 100);
        } else {
          console.warn('AdminLTE: Required elements not found after maximum retries');
        }
        return;
      }

      // Verify elements are actually connected to the DOM
      if (!appWrapper.isConnected || !sidebarWrapper.isConnected) {
        if (retryCount < MAX_RETRIES) {
          setTimeout(initAdminLTE, 100);
        }
        return;
      }

      // Ensure AdminLTE is available
      if (typeof (window as any).AdminLTE === 'undefined') {
        if (retryCount < MAX_RETRIES) {
          setTimeout(initAdminLTE, 100);
        } else {
          console.warn('AdminLTE: AdminLTE object not found after maximum retries');
        }
        return;
      }

      // Wait a bit more to ensure all styles are applied and elements are fully rendered
      setTimeout(() => {
        try {
          // Initialize AdminLTE if init method exists
          if (typeof (window as any).AdminLTE?.init === 'function') {
            (window as any).AdminLTE.init();
          }
        } catch (error) {
          // If error occurs, it might be because AdminLTE already initialized
          // or elements are not ready - this is okay, we'll suppress it
          if (error instanceof TypeError && error.message.includes('getComputedStyle')) {
            // Element not ready yet, will be handled by error handler
            console.debug('AdminLTE init delayed due to element not ready');
          } else {
            console.warn('Failed to initialize AdminLTE:', error);
          }
        }

        // Initialize OverlayScrollbars for sidebar if available
        // Disable on mobile devices to prevent touch interference
        const isMobile = window.innerWidth <= 992;
        
        if (!isMobile && (window as any).OverlayScrollbarsGlobal?.OverlayScrollbars) {
          try {
            if (sidebarWrapper && sidebarWrapper instanceof Element && sidebarWrapper.isConnected) {
              (window as any).OverlayScrollbarsGlobal.OverlayScrollbars(sidebarWrapper, {
                scrollbars: {
                  theme: 'os-theme-light',
                  autoHide: 'leave',
                  clickScroll: true,
                },
              });
            }
          } catch (error) {
            console.warn('Failed to initialize OverlayScrollbars:', error);
          }
        }

        isInitialized = true;
      }, 300); // Additional delay to ensure DOM is fully ready
    };

    const handleAdminLTELoaded = () => {
      // Wait a bit before initializing to ensure DOM is ready
      setTimeout(initAdminLTE, 100);
    };

    window.addEventListener('adminlte:loaded', handleAdminLTELoaded);
    
    // Don't start initialization immediately - wait for script to load
    // The onLoad handler will trigger initialization
    
    return () => {
      window.removeEventListener('adminlte:loaded', handleAdminLTELoaded);
      window.removeEventListener('error', errorHandler, true);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      isInitialized = false;
    };
  }, []);

  return (
    <>
      <Script
        src="/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
        id="bootstrap-js"
      />
      
      <Script
        src="/js/adminlte.min.js"
        strategy="afterInteractive"
        id="adminlte-js"
        onLoad={() => {
          if (typeof window !== 'undefined') {
            // Wait for DOM to be fully ready before triggering initialization
            const triggerInit = () => {
              // Additional delay to ensure all elements are rendered
              setTimeout(() => {
                window.dispatchEvent(new Event('adminlte:loaded'));
              }, 300);
            };

            if (document.readyState === 'complete' || document.readyState === 'interactive') {
              triggerInit();
            } else {
              window.addEventListener('load', triggerInit, { once: true });
            }
          }
        }}
        onError={(e) => {
          console.error('Failed to load AdminLTE JS:', e);
        }}
      />
      
      {children}
    </>
  );
}
