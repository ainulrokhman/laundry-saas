import Link from 'next/link';

export default function OutletNotFound() {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body text-center py-5">
              <i className="fas fa-store-slash fa-3x text-muted mb-3"></i>
              <h1 className="h5 mb-2">Outlet tidak ditemukan</h1>
              <p className="text-muted mb-4">
                Outlet yang Anda cari tidak tersedia atau sudah tidak aktif.
              </p>
              <Link href="/" className="btn btn-outline-secondary">
                <i className="fas fa-arrow-left me-2"></i>
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

