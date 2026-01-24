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

    let isInitialized = false;

    // Helper function to check if element is a valid Element
    const isValidElement = (el: any): el is Element => {
      return el instanceof Element && el.isConnected && el.ownerDocument === document;
    };

    const initAdminLTE = () => {
      if (typeof window === 'undefined') return;
      if (isInitialized) return; // Prevent multiple initializations

      // Wait for DOM to be fully ready - must be 'complete' not just 'interactive'
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdminLTE, { once: true });
        return;
      }

      // Wait for window load event to ensure all resources are loaded
      if (document.readyState !== 'complete') {
        window.addEventListener('load', initAdminLTE, { once: true });
        return;
      }

      // Ensure required elements exist and are in the DOM
      const appWrapper = document.querySelector('.app-wrapper');
      const sidebarWrapper = document.querySelector('.sidebar-wrapper');
      
      // Validate elements are actual Element instances and connected to DOM
      if (!appWrapper || !sidebarWrapper || 
          !isValidElement(appWrapper) || !isValidElement(sidebarWrapper)) {
        return;
      }

      // Ensure AdminLTE is available
      if (typeof (window as any).AdminLTE === 'undefined') {
        return;
      }

      // Wait for next frame to ensure all React renders are complete
      // and all styles are applied
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            // Double-check elements are still valid before initialization
            const currentAppWrapper = document.querySelector('.app-wrapper');
            const currentSidebarWrapper = document.querySelector('.sidebar-wrapper');
            
            if (!currentAppWrapper || !currentSidebarWrapper ||
                !isValidElement(currentAppWrapper) || !isValidElement(currentSidebarWrapper)) {
              return;
            }

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
            return;
          }

          // Initialize OverlayScrollbars for sidebar if available
          // Disable on mobile devices to prevent touch interference
          const isMobile = window.innerWidth <= 992;
          
          if (!isMobile && (window as any).OverlayScrollbarsGlobal?.OverlayScrollbars) {
            try {
              const currentSidebarWrapper = document.querySelector('.sidebar-wrapper');
              if (currentSidebarWrapper && isValidElement(currentSidebarWrapper)) {
                (window as any).OverlayScrollbarsGlobal.OverlayScrollbars(currentSidebarWrapper, {
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
        });
      });
    };

    const handleAdminLTELoaded = () => {
      // Wait for DOM to be complete before initializing
      if (document.readyState === 'complete') {
        // Use requestAnimationFrame to ensure React has finished rendering
        requestAnimationFrame(() => {
          setTimeout(initAdminLTE, 100);
        });
      } else {
        // Wait for load event
        window.addEventListener('load', () => {
          requestAnimationFrame(() => {
            setTimeout(initAdminLTE, 100);
          });
        }, { once: true });
      }
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
              // Wait for next frame to ensure all React renders are complete
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  window.dispatchEvent(new Event('adminlte:loaded'));
                });
              });
            };

            // Only trigger after DOM is complete
            if (document.readyState === 'complete') {
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
