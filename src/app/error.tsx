'use client';

/**
 * Global error boundary (segment-level).
 * Menangkap error di subtree dan menampilkan UI fallback.
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error?.message, error?.digest);
  }, [error]);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="text-center px-4">
        <h1 className="display-6 text-danger mb-3">
          <i className="fas fa-exclamation-triangle me-2" />
          Terjadi kesalahan
        </h1>
        <p className="text-muted mb-4">
          Maaf, sesuatu bermasalah. Silakan coba lagi atau kembali ke beranda.
        </p>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Coba lagi
          </button>
          <Link href="/" className="btn btn-outline-secondary">
            Ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
