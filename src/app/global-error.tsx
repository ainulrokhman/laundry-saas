'use client';

/**
 * Root-level error boundary.
 * Menangkap error di root layout; harus render html/body sendiri.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-4">
        <div className="text-center">
          <h1 className="h4 text-danger mb-3">Terjadi kesalahan sistem</h1>
          <p className="text-muted mb-4">
            Silakan refresh halaman atau coba lagi nanti.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary"
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
