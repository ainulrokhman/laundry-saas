'use client';

import { useEffect, useState } from 'react';

export function PWAInstallAlert({
    title = "Install Aplikasi",
    description = "Pasang aplikasi agar lebih mudah mengecek status laundry Anda."
}: {
    title?: string;
    description?: string;
}) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        const handleBeforeInstallPrompt = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    if (!isVisible || isInstalled) return null;

    return (
        <div className="fixed-bottom p-3 p-md-4 animate-in slide-in-from-bottom-5 duration-500" style={{ zIndex: 1050 }}>
            <div className="glass-panel border border-luxury-gold border-opacity-25 rounded-4 shadow-luxury p-3 p-md-4 position-relative overflow-hidden">
                {/* Background decoration */}
                <div className="position-absolute top-0 end-0 p-3 opacity-10 pointer-events-none">
                    <i className="fas fa-download fa-5x text-luxury-gold"></i>
                </div>

                <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3 position-relative z-1">
                    <div className="d-flex align-items-center gap-3 w-100">
                        <div className="bg-luxury-gold text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 shadow-lg" style={{ width: '48px', height: '48px' }}>
                            <i className="fas fa-mobile-alt fs-4"></i>
                        </div>
                        <div className="text-dark me-auto">
                            <h6 className="fw-bold mb-1 text-luxury-dark">{title}</h6>
                            <p className="mb-0 small text-muted text-balance lh-sm">{description}</p>
                        </div>
                        {/* Dismiss Button (Mobile) */}
                        <button
                            onClick={handleDismiss}
                            className="btn btn-link text-muted p-2 rounded-circle hover-bg-light d-sm-none flex-shrink-0"
                            aria-label="Tutup"
                            style={{ marginRight: '-0.5rem' }}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <div className="d-flex align-items-center gap-2 w-full sm:w-auto justify-content-end mt-1 mt-sm-0">
                        {/* Dismiss Button (Desktop) */}
                        <button
                            onClick={handleDismiss}
                            className="btn btn-link text-muted p-2 rounded-circle hover-bg-light d-none d-sm-block"
                            aria-label="Tutup"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        <button
                            onClick={handleInstallClick}
                            className="btn btn-luxury-gold rounded-pill px-4 fw-bold shadow-md hover-lift w-full sm:w-auto"
                        >
                            <i className="fas fa-download me-2"></i>
                            Install
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
