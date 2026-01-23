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
    // Initialize AdminLTE after scripts are loaded
    // The scripts will be loaded via Script components below
  }, []);

  return (
    <>
      {/* Load Bootstrap JS (required for AdminLTE) */}
      <Script
        src="/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
      
      {/* Load AdminLTE JS from local assets */}
      <Script
        src="/js/adminlte.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          // AdminLTE is now loaded and initialized
          if (typeof window !== 'undefined') {
            // Trigger any AdminLTE initialization if needed
            const pushMenu = document.querySelector('[data-widget="pushmenu"]');
            if (pushMenu) {
              // PushMenu will be initialized by AdminLTE JS
            }
          }
        }}
      />
      
      {children}
    </>
  );
}
